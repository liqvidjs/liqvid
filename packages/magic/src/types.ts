export type ScriptData = {
  /**
   * Whether script is crossorigin.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-crossorigin
   */ 
  crossorigin?: boolean | string;

  /**
   * Whether to apply the defer attribute
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-defer
   */
  defer?: boolean;

  /**
   * Development src.
   */ 
  development?: string | (() => string);

  /**
   * Integrity attribute for production.
   */
   integrity?: string; 

  /**
   * Production src.
   */
   production?: string | (() => string);
} | string;

export type StyleData = {
  /**
   * Development href.
   */
  development?: string;

  /**
   * Production href.
   */
  production?: string;
} | string;
