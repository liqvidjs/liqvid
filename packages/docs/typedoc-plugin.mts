import * as fs from "node:fs";
import * as path from "node:path";

import {
  type Application,
  type DeclarationReflection,
  type ProjectReflection,
  ReflectionKind,
  Renderer,
  type SignatureReflection,
  type TypeParameterReflection,
} from "typedoc";

/**
 * TypeDoc plugin that generates custom markdown documentation.
 * Each module gets its own markdown file in the docs/ folder.
 * Exports are ordered: classes, functions, types/interfaces.
 */
export function load(app: Application): void {
  // Generate our custom markdown after TypeDoc finishes
  app.renderer.on(Renderer.EVENT_BEGIN, (event) => {
    const project = event.project;
    const outDir = app.options.getValue("out") as string;
    generateDocs(project, outDir);
  });

  // Prevent default HTML generation by removing output after render
  app.renderer.on(Renderer.EVENT_END, () => {
    const outDir = app.options.getValue("out") as string;

    // Remove HTML files and directories, keep only our .md files
    const entries = fs.readdirSync(outDir);
    for (const entry of entries) {
      const fullPath = path.join(outDir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true });
      } else if (!entry.endsWith(".md")) {
        fs.unlinkSync(fullPath);
      }
    }
  });
}

function generateDocs(project: ProjectReflection, outDir: string): void {
  const docsDir = path.join(path.dirname(outDir), "docs");
  fs.mkdirSync(docsDir, { recursive: true });

  // Get all modules
  const modules =
    project.children?.filter((c) => c.kind === ReflectionKind.Module) || [];

  for (const mod of modules) {
    const outputName = mod.name === "index" ? "index" : mod.name;
    const outputPath = path.join(docsDir, `${outputName}.md`);
    const content = generateModuleDocs(mod);

    fs.writeFileSync(outputPath, content);
    console.log(`Generated ${outputPath}`);
  }
}

// Track local type names and their kinds for the current module being processed
let localTypeKinds: Map<string, ReflectionKind> = new Map();

/**
 * Get the anchor ID for a type/class/interface name
 */
function getAnchorId(name: string, kind: ReflectionKind): string {
  if (kind === ReflectionKind.Class) {
    return `class-${name.toLowerCase()}`;
  }
  if (kind === ReflectionKind.Interface) {
    return `interface-${name.toLowerCase()}`;
  }
  if (kind === ReflectionKind.Variable) {
    return `variable-${name.toLowerCase()}`;
  }
  return `type-${name.toLowerCase()}`;
}

/**
 * Generate documentation for a module
 */
function generateModuleDocs(mod: DeclarationReflection): string {
  let md = `# ${mod.name}\n\n`;

  const children = mod.children || [];

  // Build map of local type names to their kinds for linking
  localTypeKinds = new Map(children.map((c) => [c.name, c.kind]));

  // Sort children into categories
  const classes = children.filter((c) => c.kind === ReflectionKind.Class);
  const interfaces = children.filter(
    (c) => c.kind === ReflectionKind.Interface,
  );
  const typeAliases = children.filter(
    (c) => c.kind === ReflectionKind.TypeAlias,
  );
  const variables = children.filter((c) => c.kind === ReflectionKind.Variable);
  const functions = children.filter((c) => c.kind === ReflectionKind.Function);

  // Render in order: classes, functions, variables, interfaces, types
  for (const cls of classes) {
    md += renderClass(cls);
    md += "\n---\n\n";
  }

  for (const func of functions) {
    md += renderFunction(func);
    md += "\n---\n\n";
  }

  for (const variable of variables) {
    md += renderVariable(variable);
    md += "\n---\n\n";
  }

  for (const iface of interfaces) {
    md += renderInterface(iface);
    md += "\n---\n\n";
  }

  for (const alias of typeAliases) {
    md += renderTypeAlias(alias);
    md += "\n---\n\n";
  }

  // Remove trailing separator
  md = md.replace(/\n---\n\n$/, "\n");

  return md;
}

/**
 * Render a comment to markdown
 */
function renderComment(reflection: { comment?: unknown }): string {
  const comment = reflection.comment as
    | { summary?: { kind: string; text: string }[] }
    | undefined;
  if (!comment?.summary) return "";

  return comment.summary
    .map((part) => {
      if (part.kind === "text") return part.text;
      if (part.kind === "code") return part.text;
      if (part.kind === "inline-tag") return `\`${part.text}\``;
      return part.text;
    })
    .join("");
}

/**
 * Render a type name, optionally as a link if it's a local type
 */
function renderTypeName(name: string, asLink: boolean): string {
  if (!name) return "unknown";

  // Check if this is a local type we can link to
  if (asLink) {
    const kind = localTypeKinds.get(name);
    if (kind !== undefined) {
      return `[${name}](#${getAnchorId(name, kind)})`;
    }
  }

  return name;
}

/**
 * Render a type to string
 * @param type - The type to render
 * @param asLink - Whether to render local types as links (false for code blocks)
 */
function renderType(type: unknown, asLink = false): string {
  if (!type) return "unknown";

  const t = type as {
    type: string;
    name?: string;
    types?: unknown[];
    elements?: unknown[];
    declaration?: DeclarationReflection;
    typeArguments?: unknown[];
    queryType?: { name?: string };
    target?: DeclarationReflection | number;
  };

  if (t.type === "intrinsic") {
    return t.name || "unknown";
  }

  if (t.type === "reference") {
    const typeName = renderTypeName(t.name || "unknown", asLink);

    if (t.typeArguments && t.typeArguments.length > 0) {
      return `${typeName}<${t.typeArguments.map((ta) => renderType(ta, asLink)).join(", ")}>`;
    }
    return typeName;
  }

  if (t.type === "union") {
    return (
      t.types?.map((ut) => renderType(ut, asLink)).join(" | ") || "unknown"
    );
  }

  if (t.type === "intersection") {
    return (
      t.types?.map((it) => renderType(it, asLink)).join(" & ") || "unknown"
    );
  }

  if (t.type === "tuple") {
    return `[${t.elements?.map((el) => renderType(el, asLink)).join(", ") || ""}]`;
  }

  if (t.type === "reflection" && t.declaration) {
    const props = t.declaration.children?.filter(
      (c) => c.kind === ReflectionKind.Property,
    );
    if (props && props.length > 0) {
      const propStr = props
        .map((p) => {
          const opt = p.flags?.isOptional ? "?" : "";
          return `${p.name}${opt}: ${renderType(p.type, asLink)}`;
        })
        .join("; ");
      return `{ ${propStr} }`;
    }
    return "object";
  }

  if (t.type === "query") {
    return `typeof ${t.queryType?.name || "unknown"}`;
  }

  return t.name || "unknown";
}

/**
 * Render a signature
 */
function renderSignature(sig: SignatureReflection, methodName: string): string {
  const params =
    sig.parameters
      ?.filter((p) => p.name !== "__namedParameters")
      .map((p) => {
        const optional = p.flags?.isOptional ? "?" : "";
        return `${p.name}${optional}: ${renderType(p.type)}`;
      })
      .join(", ") || "";

  const returnType = renderType(sig.type);
  return `${methodName}(${params}): ${returnType}`;
}

/**
 * Render parameters documentation
 */
function renderParameters(
  params: TypeParameterReflection[] | undefined,
): string {
  if (!params || params.length === 0) return "";

  const filtered = params.filter(
    (p) => p.name !== "__namedParameters",
  ) as unknown as DeclarationReflection[];
  if (filtered.length === 0) return "";

  let md = "\n**Parameters:**\n\n";
  for (const param of filtered) {
    const optional = param.flags?.isOptional ? " (optional)" : "";
    const desc = renderComment(param);
    md += `- \`${param.name}\`: ${renderType(param.type, true)}${optional}`;
    if (desc) {
      md += ` - ${desc}`;
    }
    md += "\n";
  }
  return md;
}

/**
 * Render a class
 */
function renderClass(cls: DeclarationReflection): string {
  let md = `## class ${cls.name}\n\n`;

  // Class description
  const desc = renderComment(cls);
  if (desc) {
    md += `${desc}\n\n`;
  }

  // Extends
  if (cls.extendedTypes && cls.extendedTypes.length > 0) {
    md += `**Extends:** ${cls.extendedTypes.map((t) => renderType(t, true)).join(", ")}\n\n`;
  }

  // Implements
  if (cls.implementedTypes && cls.implementedTypes.length > 0) {
    md += `**Implements:** ${escapeTags(cls.implementedTypes.map((t) => renderType(t, true)).join(", "))}\n\n`;
  }

  // Find constructor
  const ctor = cls.children?.find((c) => c.kind === ReflectionKind.Constructor);
  if (ctor?.signatures) {
    md += `### constructor\n\n`;
    for (const sig of ctor.signatures) {
      const params =
        sig.parameters
          ?.filter((p) => p.name !== "__namedParameters")
          .map((p) => {
            const optional = p.flags?.isOptional ? "?" : "";
            return `${p.name}${optional}: ${renderType(p.type)}`;
          })
          .join(", ") || "";

      md += `\`\`\`typescript\nnew ${cls.name}(${params})\n\`\`\`\n\n`;

      const sigDesc = renderComment(sig);
      if (sigDesc) {
        md += `${sigDesc}\n\n`;
      }

      md += renderParameters(
        sig.parameters as unknown as TypeParameterReflection[],
      );
    }
    md += "\n";
  }

  // Static methods
  const staticMethods =
    cls.children?.filter(
      (c) =>
        c.kind === ReflectionKind.Method &&
        c.flags?.isStatic &&
        !c.flags?.isInherited &&
        !c.flags?.isProtected,
    ) || [];

  if (staticMethods.length > 0) {
    // md += `### Static Methods\n\n`;
    for (const method of staticMethods) {
      md += renderMethod(method, `${cls.name}.`, "()");
    }
  }

  // Instance methods
  const instanceMethods =
    cls.children?.filter(
      (c) =>
        c.kind === ReflectionKind.Method &&
        !c.flags?.isStatic &&
        !c.flags?.isInherited &&
        !c.flags?.isProtected,
    ) || [];

  if (instanceMethods.length > 0) {
    // md += `### Methods\n\n`;
    for (const method of instanceMethods) {
      md += renderMethod(method, "", "()");
    }
  }

  return md;
}

/**
 * Render a method
 */
function renderMethod(
  method: DeclarationReflection,
  prefix = "",
  suffix = "",
): string {
  let md = `### ${prefix}${method.name}${suffix}\n\n`;

  if (method.signatures) {
    for (const sig of method.signatures) {
      md += `\`\`\`typescript\n${renderSignature(sig, method.name)}\n\`\`\`\n\n`;

      const desc = renderComment(sig);
      if (desc) {
        md += `${desc}\n\n`;
      }

      md += renderParameters(
        sig.parameters as unknown as TypeParameterReflection[],
      );

      // Return description from block tags
      const comment = sig.comment as
        | { blockTags?: { tag: string; content: { text: string }[] }[] }
        | undefined;
      const returnTag = comment?.blockTags?.find((t) => t.tag === "@returns");
      if (returnTag) {
        md += `\n**Returns:** ${returnTag.content.map((c) => c.text).join("")}\n`;
      }

      // Examples
      const exampleTags =
        comment?.blockTags?.filter((t) => t.tag === "@example") || [];
      for (const example of exampleTags) {
        md += `\n**Example:**\n${example.content.map((c) => c.text).join("")}\n`;
      }
    }
  }

  md += "\n";
  return md;
}

/**
 * Render a function
 */
function renderFunction(func: DeclarationReflection): string {
  let md = `## Function: ${func.name}\n\n`;

  if (func.signatures) {
    for (const sig of func.signatures) {
      md += `\`\`\`typescript\n${renderSignature(sig, func.name)}\n\`\`\`\n\n`;

      const desc = renderComment(sig);
      if (desc) {
        md += `${desc}\n\n`;
      }

      md += renderParameters(
        sig.parameters as unknown as TypeParameterReflection[],
      );
    }
  }

  return md;
}

/**
 * Render an interface
 */
function renderInterface(iface: DeclarationReflection): string {
  let md = `## interface ${iface.name}\n\n`;

  const desc = renderComment(iface);
  if (desc) {
    md += `${desc}\n\n`;
  }

  // Methods
  const methods =
    iface.children?.filter((c) => c.kind === ReflectionKind.Method) || [];
  if (methods.length > 0) {
    // md += `### Methods\n\n`;
    for (const method of methods) {
      md += renderMethod(method, "", "()");
    }
  }

  // Properties
  const properties =
    iface.children?.filter((c) => c.kind === ReflectionKind.Property) || [];
  if (properties.length > 0) {
    // md += `### Properties\n\n`;
    for (const prop of properties) {
      const optional = prop.flags?.isOptional ? "?" : "";
      md += `### ${prop.name}${optional}\n\n`;
      md += `\`\`\`typescript\n${prop.name}${optional}: ${renderType(prop.type)}\n\`\`\`\n\n`;

      const propDesc = renderComment(prop);
      if (propDesc) {
        md += `${propDesc}\n\n`;
      }
    }
  }

  return md;
}

/**
 * Render a type alias
 */
function renderTypeAlias(alias: DeclarationReflection): string {
  let md = `## type ${alias.name}\n\n`;

  const desc = renderComment(alias);
  if (desc) {
    md += `${desc}\n\n`;
  }

  // Check if this is an object-like type with properties
  // Properties can be in type.declaration.children or directly in alias.children
  const typeDecl = (alias.type as { declaration?: DeclarationReflection })
    ?.declaration;
  const props =
    typeDecl?.children?.filter((c) => c.kind === ReflectionKind.Property) ||
    alias.children?.filter((c) => c.kind === ReflectionKind.Property);

  if (props && props.length > 0) {
    md += `\`\`\`typescript\ntype ${alias.name} = {\n`;
    for (const prop of props) {
      const optional = prop.flags?.isOptional ? "?" : "";
      md += `  ${prop.name}${optional}: ${renderType(prop.type)};\n`;
    }
    md += `}\n\`\`\`\n\n`;

    // List properties with descriptions
    // md += `### Properties\n\n`;
    for (const prop of props) {
      const optional = prop.flags?.isOptional ? "?" : "";
      md += `### ${prop.name}${optional}\n\n`;
      md += `- **Type:** ${renderType(prop.type, true)}\n`;

      const propDesc = renderComment(prop);
      if (propDesc) {
        md += `- ${propDesc}\n`;
      }
      md += "\n";
    }
  } else {
    // Regular type alias without properties
    md += `\`\`\`typescript\ntype ${alias.name} = ${renderType(alias.type)}\n\`\`\`\n\n`;
  }

  return md;
}

/**
 * Render a variable
 */
function renderVariable(variable: DeclarationReflection): string {
  let md = `## Variable: ${variable.name}\n\n`;

  const desc = renderComment(variable);
  if (desc) {
    md += `${desc}\n\n`;
  }

  md += `\`\`\`typescript\nconst ${variable.name}: ${renderType(variable.type)}\n\`\`\`\n\n`;

  return md;
}

function escapeTags(str: string) {
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
