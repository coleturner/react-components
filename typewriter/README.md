# Typewriter
A wrapper around react-typist to derive the rendering sequence
and handle reduced motion/accessibility.

## Input-driven rendering
For example:
```jsx
<Typewriter text="I enjoy engineering 👉good👈great ideas for the web." />
```

It can handle multiple backspace sequences:
```jsx
<Typewriter text="I enjoy engineering 👉okay👈good👈great ideas for the web." />
```

- types I enjoy engineering
- types okay
- backspaces okay
- types good
- backspaces good
- types great ideas for the web

And multiple instances:

```jsx
<Typewriter text="I enjoy engineering 👉okay👈good👈great 👉ideas👈projects for the web." />
```
- types I enjoy engineering
- types okay
- backspaces okay
- types good
- backspaces good
- types great ideas
- backspaces ideas
- types projects for the web

## Reduced Motion
Using framer-motions `useReducedMotion`, the input string is pre-parsed to remove the backspace sequencing so that users with vestibular disorders do not see any typing motion.
