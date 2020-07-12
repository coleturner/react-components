import Typist from 'react-typist';
import { useReducedMotion} from 'framer-motion';

/*
  A wrapper around react-typist to derive the rendering sequence
  and handle reduced motion/accessibility.
  
  For example:
  <Typewriter text="I enjoy engineering 👉good👈great ideas for the web." />
  
  It can handle multiple backspace sequences:
  <Typewriter text="I enjoy engineering 👉okay👈good👈great ideas for the web." />
    -> types I enjoy engineering
    -> types okay
    -> backspaces okay
    -> types good
    -> backspaces good
    -> types great ideas for the web
  
  And multiple instances:
  <Typewriter text="I enjoy engineering 👉okay👈good👈great 👉ideas👈projects for the web." />
    -> types I enjoy engineering
    -> types okay
    -> backspaces okay
    -> types good
    -> backspaces good
    -> types great ideas
    -> backspaces ideas
    -> types projects for the web
*/

export default function Typewriter({ text }) {
  const shouldReduceMotion = useReducedMotion();
  const parts = text.split(/(?=👉|👈)/gm);

  let backspaceLength = 0;

  if (shouldReduceMotion) {
    return text.replace(/👉.*(?=👈|👉)👈|👉/gm, '');
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <Typist cursor={{ hideWhenDone: true, hideWhenDoneDelay: 0 }}>
        {parts.map((part, index) => {
          let shouldSetBackspaceLength = false;
          let shouldBackspace = false;

          if (part.startsWith('👉') || part.startsWith('👈')) {
            shouldSetBackspaceLength = true;

            if (part.startsWith('👈')) {
              shouldBackspace = true;
            }

            part = part.replace(/^👉|👈/, '');
          }

          const render = [];

          if (shouldBackspace) {
            render.push(
              <Typist.Backspace
                key={'backspace' + index}
                count={backspaceLength}
                delay={200}
              />
            );
          }

          if (shouldSetBackspaceLength) {
            backspaceLength = part.length;
          }

          render.push(<span key={index}>{part}</span>);

          return render;
        })}
      </Typist>
    </div>
  );
}
