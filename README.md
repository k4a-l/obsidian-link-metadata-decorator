[![PayPal](https://github.com/user-attachments/assets/022d3ada-7995-4a27-b680-5ab6cfc117e1)](https://paypal.me/k4al)
[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/kasahala)

# Obsidian Link Metadata Decorator

Link Metadata Decorator is a plugin for [Obsidian](https://obsidian.md) that allows you to add icons, text, and custom styles to intDecorate links based on the frontmatter, tags, or file path of the linked file.
**Note: This plugin currently supports Live Preview only.**

## Features

- **Decorate Links**: Add icons and text before or after internal links.
- **Metadata Matching**: Apply decorations based on the linked note's **Tags** or **Frontmatter** properties.
- **Custom CSS Classes**: Add custom CSS classes to links for unlimited styling possibilities.
- **Live Preview Support**: Decorations appear directly in the editor while typing (except when the cursor is on the link).

> **Note**: While editing, decorations may occasionally appear unnaturally. Refocusing or prompting a redraw will usually fix this.

## Example

Default live preview:

![live-preview-default.png](https://raw.githubusercontent.com/k4a-l/obsidian-link-metadata-decorator/refs/heads/main/assets/live-preview-default.png)

After configuration:

![live-preview-result.png](https://raw.githubusercontent.com/k4a-l/obsidian-link-metadata-decorator/refs/heads/main/assets/live-preview-result.png)

Settings:

- [data.json](https://github.com/k4a-l/obsidian-link-metadata-decorator/blob/main/assets/example/data.json)
- [style.css](https://github.com/k4a-l/obsidian-link-metadata-decorator/blob/main/assets/example/styles.css)

## Usage

### 1. Create a Rule

Go to **Settings > Link Metadata Decorator** and click **"Add Rule"**.

#### **Target**: Choose matching strategy

All target metadata of the linked file.

- `Tag`: Match by a specific tag.
- `Frontmatter`: Match by a frontmatter property.
- `Metadata (Advanced Script)`: Use JavaScript to inspect metadata (`tags`, `frontmatter`, `name`)  and dynamically determining decorations.

#### Target: Tag

- Tag Name: Enter the tag name (without `#`).
- Position: Choose `After Link` or `Before Link`.
- Custom CSS Class: A class name to add to the link and decoration (e.g., `todo`).
- Text Append: Text to display next to the link
- Icon Append: Obsidian Icon ID to display (e.g., `lucide-check-circle`).   [Browse available icons here](https://fevol.github.io/obsidian-notes/utils/icons/)

#### Target: Frontmatter

- Frontmatter Key: Enter the frontmatter property name.
- Value to match: Enter the value to match.
  - Supports JS expressions `(v:string):boolean` (eg: `` `v => v>10` ``).
- Position: Same as Tag.
- Custom CSS Class: Same as Tag.
  - Supports JS expressions `(v:string):string)` (eg: `` `v=> v>10 ? "over" : "in-range"` ``).
- Text Append: Same as Tag.
  - Supports JS expressions. Same as Custom CSS Class.
- Icon Append: Same as Tag.
  - Supports JS expressions. Same to Custom CSS Class.

#### Target: Metadata

##### Script

type:

```typescript
type Func = (meta: { tags: string[]; frontmatter: Record<string, any> }) => {
    before?: { icon?: string; text?: string };
    after?: { icon?: string; text?: string };
    classname?: string;
};
    
```

eg:

```javascript
(meta) => {
    if (meta.tags.includes("active"))
        return { after: { icon: "lucide-check" }, classname: "active" };
}
```

#### Eval Function of frontmatter value

### 2. Styling with CSS

By assigning a **Custom CSS Class** in the rule settings, you can control the appearance of specific links completely.

#### Base Classes

The plugin uses the following classes structure:

- `.lmd-decoration`: The container for the added icon/text.
- `.lmd-pos-before`: Added when position is "Before Link".
- `.lmd-pos-after`: Added when position is "After Link".
- `.lmd-icon`: The icon container.
- `.lmd-link-text`: Added to the link itself if a Custom CSS Class is set.
