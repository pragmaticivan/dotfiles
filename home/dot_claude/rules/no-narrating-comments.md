---
paths:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs,py,go,rb,rs,java,kt,swift,c,h,cc,cpp,hpp,cs,php,lua,sh,bash,zsh,fish,tf,tfvars,hcl,sql,yaml,yml,toml,Dockerfile}"
---

# Comments in code

Write the code clean as you write it. Do not write a narrating comment and then
remove it in a later pass. The later pass fails.

Delete a comment that repeats what the next line does. The code says it.

Delete a phase banner or a step banner. `# Phase 1: add cards` and
`// Step 2: verify` are examples. The assertion text or the log string is the
only description you need. Write `assert(ok, 'persisted across restart')`, and
do not write a `// move the card` comment above the code.

Delete code that you put in a comment. Git keeps the old version.

Delete a comment that tells the reader to ignore a rule or a warning, unless the
task is to add that comment.

Keep a comment only for a *why* that the code cannot show. A link to an issue, a
measured constraint, or a workaround for a named bug is a good *why*.

This applies to each file that you write. It applies to a subagent diff and to a
throwaway verify script.
