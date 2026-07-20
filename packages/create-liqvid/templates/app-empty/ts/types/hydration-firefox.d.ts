import "react";

declare module "react" {
  interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
    /**
     * Firefox (unlike other browsers) persists the `disabled` state of inputs
     * across page reloads, which causes React hydration mismatch errors.
     *`autocomplete` on buttons is a non-standard attribute to disable this behavior.
     * @see <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete#:~:text=Note%3A%20The,654072%2E>
     */
    autoComplete?: "on" | "off" | string;
  }
}
