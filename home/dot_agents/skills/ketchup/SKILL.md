---
# Source: https://github.com/cursor/plugins/blob/main/pstack/skills/ketchup/SKILL.md
name: ketchup
description: "Catch the user up on what changed in this chat since their last message, and list each decision that waits on them. Use for /ketchup, 'catch me up', 'what did I miss', a user who comes back, or the end of a long or unattended run."
---

# Ketchup

Catch the user up on what changed in this chat since their last message before this request. Help them understand each change, not only its status. Then show each decision that waits on them, so that they can make it from your reply alone. Notifications and subagent results are not their messages. Think that the user remembers their last message and nothing after it.

Use the voice of the [bro](../bro/SKILL.md) skill, but not its task. Write plain words and short sentences, with no jargon, as one person who catches up another. Tell what changed for the user, not how you did it. Write "the tests pass", not "CI is green". Do not give hashes, file paths, commands, build numbers, or test counts, unless the user needs one to act. Use the name that the user knows for each PR, branch, or agent, not a label that you made. If a fact needs context, give the context or remove the fact.

## Collect the changes

Do not change anything in this turn. Make visuals only from what you have now. Do not change code, start an app or a job, or post anything. Collect your work since the user's last message, the subagent reports, and the messages from other persons in this chat. Get the current status of each PR, CI run, or agent that this chat touched. Compare each number that you show with its source facts. When you correct a number, say so.

An action item is a decision or a step that only the user can do. Examples are a product decision, an approval, an action that you cannot undo, or access that you do not have. Include each action item that still waits on the user, also one from before their last message. Work that you can do yourself is not an action item. Do not make up a decision to fill the reply. A step that the user did not ask for and the work does not need is not an action item. The exception is a step that you cannot undo and that waits on the user. Give it one line and no visual.

One decision can apply to many items, for example each PR in a set that waits for merge. For each item, collect its link, the change for users, the evidence for your recommendation, its risk, and your recommendation. Write "unknown" for a fact that the decision needs and you do not know. Do not give a link that you do not have.

## Write the reply

Use most words on the decisions, not on the story. Tell what happened in less than 100 words, without the pictures. Use fewer words when less happened. Do not tell about work that changed nothing for the user. Give each item approximately 30 words. The reply length increases with the number of items. Two items need much less than 150 words in total, without the pictures. Thirty items need many more words.

**Never cut items or make them shorter to stay below a word count.** Do not put a count in place of a list. Do not put a link in place of an item. A link can add detail, but the reply alone must be sufficient to decide.

Start with one short sentence that names what waits on the user, or that says nothing waits. The action items give the details. If nothing happened and nothing waits on the user, say so and stop.

Then show what happened, pictures first:

1. Put inline the screenshots and videos that the work made. Then put any diagram that explains a change.
2. Give one short bullet for each thing that the user asked for. Tell the result, and if it is done, still in progress, failed, or not checked.
3. Below the bullets, give a maximum of three short lines that change what the user knows or must do.
4. Name in one line the work that remains and that you can do yourself.

Write each bullet as you say it aloud. Write "Search was slow because an index was missing", not "Search review: done" or "Slow search: missing index". Name each bug that you found and fixed during the work. Each line must be true when a person reads it alone. Do not mark an item as done when it still waits on the user. Do not give in the bullets what the action items tell.

Then give the action items. Ask for the decision that the user owns, for example merge, approve, or select. Give your recommendation. Your recommendation includes a step that you do first, a step that must occur first, and a step that you cannot undo. Give the number or link of each PR, issue, or agent that a decision is about. Do this also in a decision between options.

Make the shape agree with the decision:

- **A decision about one item.** Write one bullet. Give the decision, your recommendation, the change for users, the evidence, and the risk. Name the item one time.
- **Items that share a decision.** Write the decision and your recommendation one time. Then give each item its own bullet, the item with the highest risk first. Give its link and name, the change for users, the evidence, and the risk. Give a recommendation for an item only when it is different from the shared one.
- **A decision between options.** Give each option that the work examined. For each option, tell what the user gets and what it costs, and give the current status when there is one. These costs are the risk of the decision, thus do not add a different risk line. When the screenshots above show the options, write the gain and cost of each option below its screenshot.

Give the risk of each item, also when it is low, for example "Low risk: only the colors change." Tell what a wait costs only when the cost is more than a delay, for example a missed deadline or lost data.

## Visuals

A visual is a picture: a screenshot, a video, a Mermaid diagram, a Mermaid chart, or a generated image. A Markdown table is not a visual, also with before and after columns.

When a picture is easier to understand than sentences, draw it. Examples are how a design or a system works, a PR stack or a dependency chain with the status of each PR, the before and after of a fix, or options side by side. Do not draw a status list, a list of action items, or boxes with no connections. Do not give a fact two times, in text or in two visuals.

Make each visual small, so that a person can read it quickly. Use a maximum of six boxes, with a maximum of eight words in each box. Write labels in the plain words that a person says, not tags such as "Tests: pass". A fact that needs a sentence goes in the text, or nowhere.

When a change is visible, put its screenshots and videos inline, not only as links. If a visible change has no screenshot, write "No screenshot yet" in its bullet, and tell there what changed on the screen. Draw diagrams and charts only from facts that you have. Use a Mermaid flowchart for how items connect, and a Mermaid `xychart-beta` or `pie` chart for numbers. Do not invent a number. Do not draw or generate a picture of a screen that you did not capture. Give links only to artifacts that exist.
