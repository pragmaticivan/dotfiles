#!/usr/bin/env python3
"""Ask the local strands-decider model. Read a request as JSON on stdin, print one JSON line per state."""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

URL = os.environ.get("DECIDER_URL", "http://localhost:11434/v1/systemone")
MODEL = os.environ.get("DECIDER_MODEL", "strands-decider")


def ask(state, questions):
    body = json.dumps({"model": MODEL, "state": state, "questions": questions}).encode()
    request = urllib.request.Request(URL, data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.load(response)["answers"]
    except urllib.error.HTTPError as error:
        sys.exit(f"decider: HTTP {error.code} from {URL}: {error.read().decode()[:500]}")
    except urllib.error.URLError as error:
        sys.exit(f"decider: cannot reach {URL} ({error.reason}). Start Ollama with the {MODEL} model.")


def verdict(answer, threshold):
    kind = answer["type"]
    if kind == "noul":
        p_yes = answer["noul"]
        confidence = max(p_yes, 1 - p_yes)
        return {"answer": "yes" if p_yes >= 0.5 else "no", "confidence": round(confidence, 3), "sure": confidence >= threshold}
    if kind == "choice":
        label = answer["choice"]
    else:
        probabilities = answer["probabilities"]
        label = answer["legend"][max(probabilities, key=probabilities.get)]
    result = {"answer": label, "confidence": round(answer["confidence"], 3), "sure": answer["confidence"] >= threshold}
    if kind == "score":
        result["score"] = round(answer["score"], 3)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state-file", help="read the state from this file, not from the request")
    parser.add_argument("--threshold", type=float, default=0.9, help="confidence for sure=true (default 0.9)")
    parser.add_argument("--raw", action="store_true", help="print the model answers without the verdict")
    args = parser.parse_args()

    request = json.load(sys.stdin)
    if args.state_file:
        with open(args.state_file) as handle:
            request["state"] = handle.read()
    states = request["states"] if "states" in request else [request["state"]]

    for state in states:
        answers = ask(state, request["questions"])
        if not args.raw:
            answers = {name: verdict(answer, args.threshold) for name, answer in answers.items()}
        print(json.dumps(answers))


if __name__ == "__main__":
    main()
