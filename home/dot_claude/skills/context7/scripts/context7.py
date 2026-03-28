#!/usr/bin/env python3
"""
Context7 REST API wrapper - Cross-platform Python implementation
Based on @upstash/context7-mcp source

Usage:
    context7.py search <query>
    context7.py docs <library-id> [topic] [mode]

Examples:
    context7.py search react
    context7.py search "next.js app router"
    context7.py docs /facebook/react hooks
    context7.py docs /vercel/next.js routing
    context7.py docs /prisma/prisma queries info
"""

import sys
import json
import os
from urllib.request import Request, urlopen
from urllib.parse import quote
from urllib.error import HTTPError, URLError

BASE_URL = "https://context7.com/api/v2"
API_KEY = os.environ.get("CONTEXT7_API_KEY", "")


def make_request(url):
    """Make HTTP request with optional authentication.

    Args:
        url: The URL to request

    Returns:
        Response text as string

    Raises:
        SystemExit: On HTTP or URL errors
    """
    headers = {"X-Context7-Source": "claude-skill"}
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"

    try:
        req = Request(url, headers=headers)
        with urlopen(req) as response:
            return response.read().decode("utf-8")
    except HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}", file=sys.stderr)
        if e.code == 404:
            print("Suggestions:", file=sys.stderr)
            print(
                "  - Verify the library ID format: /org/project (e.g., /facebook/react)",
                file=sys.stderr,
            )
            print(
                "  - Run 'context7.py search <name>' to find the correct library ID",
                file=sys.stderr,
            )
            print(
                "  - Try a broader search term if the library name is ambiguous",
                file=sys.stderr,
            )
        elif e.code == 429:
            print("Rate limited. Suggestions:", file=sys.stderr)
            print(
                "  - Set CONTEXT7_API_KEY environment variable for higher limits",
                file=sys.stderr,
            )
            print(
                "  - Get a free API key at: https://context7.com/dashboard",
                file=sys.stderr,
            )
            print("  - Wait a few minutes and retry", file=sys.stderr)
        elif e.code >= 500:
            print(
                "Server error. The Context7 service may be temporarily unavailable.",
                file=sys.stderr,
            )
            print("Try again in a few minutes.", file=sys.stderr)
        sys.exit(1)
    except URLError as e:
        print(f"URL Error: {e.reason}", file=sys.stderr)
        print("Suggestions:", file=sys.stderr)
        print("  - Check your internet connection", file=sys.stderr)
        print("  - Verify no firewall is blocking context7.com", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def search_library(query):
    """Search for library ID.

    Args:
        query: Search query string
    """
    if not query:
        print("Usage: context7.py search <query>", file=sys.stderr)
        print("Example: context7.py search react", file=sys.stderr)
        sys.exit(1)

    encoded_query = quote(query)
    url = f"{BASE_URL}/search?query={encoded_query}"

    print(f"Searching for: {query}")
    print("---")

    response_text = make_request(url)

    try:
        data = json.loads(response_text)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON response: {e}", file=sys.stderr)
        print(f"Raw response: {response_text}", file=sys.stderr)
        sys.exit(1)

    if "results" in data:
        for result in data["results"]:
            print(f"ID: {result['id']}")
            print(f"Name: {result.get('title', 'Unknown')}")
            print(
                f"Snippets: {result.get('totalSnippets', 'N/A')} | Score: {result.get('benchmarkScore', 'N/A')}"
            )
            desc = result.get("description", "No description")
            if len(desc) > 100:
                desc = desc[:100]
            print(f"Description: {desc}")
            print("---")
    elif "error" in data:
        print(f"Error: {data['error']}", file=sys.stderr)
        sys.exit(1)
    else:
        print(json.dumps(data, indent=2))


def fetch_docs(library_id, topic="", mode="code"):
    """Fetch documentation for a library.

    Args:
        library_id: Library ID (e.g., /facebook/react)
        topic: Optional focus area (e.g., hooks, routing)
        mode: 'code' for API/examples or 'info' for guides
    """
    if not library_id:
        print("Usage: context7.py docs <library-id> [topic] [mode]", file=sys.stderr)
        print("", file=sys.stderr)
        print("Arguments:", file=sys.stderr)
        print(
            "  library-id    Format: /org/project or /org/project/version",
            file=sys.stderr,
        )
        print(
            "  topic         Optional: Focus area (e.g., 'hooks', 'routing')",
            file=sys.stderr,
        )
        print("  mode          Optional: 'code' (default) or 'info'", file=sys.stderr)
        print("", file=sys.stderr)
        print("Examples:", file=sys.stderr)
        print("  context7.py docs /facebook/react hooks", file=sys.stderr)
        print("  context7.py docs /vercel/next.js routing code", file=sys.stderr)
        print('  context7.py docs /vercel/next.js "app router" info', file=sys.stderr)
        sys.exit(1)

    if mode not in ["code", "info"]:
        print("Error: mode must be 'code' or 'info'", file=sys.stderr)
        sys.exit(1)

    cleaned_id = library_id.lstrip("/")
    url = f"{BASE_URL}/docs/{mode}/{cleaned_id}?type=txt"

    if topic:
        encoded_topic = quote(topic)
        url += f"&topic={encoded_topic}"

    print(f"Fetching docs: /{cleaned_id}")
    if topic:
        print(f"Mode: {mode} | Topic: {topic}")
    else:
        print(f"Mode: {mode}")
    print("---")

    response_text = make_request(url)
    print(response_text)


def show_help():
    """Display help message."""
    print("Context7 Documentation Lookup")
    print("")
    print("Usage: context7.py <command> [args...]")
    print("")
    print("Commands:")
    print("  search <query>                    Search for library ID")
    print("  docs <library-id> [topic] [mode]  Fetch documentation")
    print("")
    print("Modes:")
    print("  code    API references and code examples (default)")
    print("  info    Conceptual guides and tutorials")
    print("")
    print("Examples:")
    print("  context7.py search react")
    print('  context7.py search "next.js app router"')
    print("  context7.py docs /facebook/react hooks")
    print("  context7.py docs /vercel/next.js routing")
    print("  context7.py docs /prisma/prisma queries info")
    print("")
    print("Environment:")
    print("  CONTEXT7_API_KEY    Optional API key for higher rate limits")
    print("                      Get one at: https://context7.com/dashboard")


def main():
    """Main entry point for the CLI."""
    if len(sys.argv) < 2:
        show_help()
        sys.exit(1)

    command = sys.argv[1]

    if command in ["-h", "--help", "help"]:
        show_help()
        sys.exit(0)
    elif command == "search":
        query = " ".join(sys.argv[2:])
        search_library(query)
    elif command == "docs":
        if len(sys.argv) < 3:
            print("Error: docs requires a library-id argument", file=sys.stderr)
            sys.exit(1)

        library_id = sys.argv[2]
        topic = sys.argv[3] if len(sys.argv) > 3 else ""
        mode = sys.argv[4] if len(sys.argv) > 4 else "code"

        fetch_docs(library_id, topic, mode)
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        print("", file=sys.stderr)
        show_help()
        sys.exit(1)


if __name__ == "__main__":
    main()