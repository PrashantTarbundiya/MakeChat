import { marked } from 'marked';
import { default as HTMLToDOCX } from 'html-to-docx';
import puppeteer from 'puppeteer';

export const generateFileBuffer = async (markdownContent, fileType) => {
  // Convert basic markdown to HTML for doc types that require it
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #111; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
        code { font-family: monospace; background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      ${marked.parse(markdownContent)}
    </body>
    </html>
  `;

  switch (fileType.toLowerCase()) {
    case 'pdf': {
      let browser;
      try {
        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } });
        return { buffer: Buffer.from(pdfBuffer), mimetype: 'application/pdf' };
      } finally {
        if (browser) await browser.close();
      }
    }
    
    case 'docx': {
      try {
        const docxBuffer = await HTMLToDOCX(htmlContent, null, {
          table: { row: { cantSplit: true } },
          footer: true,
          pageNumber: true
        });
        return { buffer: Buffer.from(docxBuffer), mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
      } catch (e) {
        console.error('[FileGenerator] DOCX generation error:', e);
        throw e;
      }
    }
    
    case 'html': {
      return { buffer: Buffer.from(htmlContent), mimetype: 'text/html' };
    }

    case 'json': {
      let jsonInput = markdownContent.replace(/```json/gi, '').replace(/```/g, '').trim();
      try {
        const parsed = JSON.parse(jsonInput);
        jsonInput = JSON.stringify(parsed, null, 2);
      } catch (e) {
      }
      return { buffer: Buffer.from(jsonInput), mimetype: 'application/json' };
    }
    
    case 'csv': {
      let csvInput = markdownContent.replace(/```csv/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(csvInput), mimetype: 'text/csv' };
    }
    
    case 'tsv': {
      let tsvInput = markdownContent.replace(/```tsv/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(tsvInput), mimetype: 'text/tab-separated-values' };
    }
    
    case 'xml': {
      let xmlInput = markdownContent.replace(/```xml/gi, '').replace(/```/g, '').trim();
      if (!xmlInput) {
        xmlInput = markdownContent;
      }
      const xmlBuffer = Buffer.from(xmlInput, 'utf8');
      return { buffer: xmlBuffer, mimetype: 'application/xml' };
    }
    
    case 'yaml':
    case 'yml': {
      let yamlInput = markdownContent.replace(/```yaml/gi, '').replace(/```yml/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(yamlInput, 'utf8'), mimetype: 'text/yaml' };
    }
    
    case 'md':
    case 'markdown': {
      const mdBuffer = Buffer.from(markdownContent, 'utf8');
      return { buffer: mdBuffer, mimetype: 'text/markdown' };
    }

    case 'sql': {
      let sqlInput = markdownContent.replace(/```sql/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(sqlInput), mimetype: 'text/plain' };
    }

    case 'jsonl':
    case 'ndjson': {
      let jsonlInput = markdownContent.replace(/```jsonl/gi, '').replace(/```ndjson/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(jsonlInput), mimetype: 'application/x-jsonlines' };
    }

    case 'toml': {
      let tomlInput = markdownContent.replace(/```toml/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(tomlInput), mimetype: 'text/plain' };
    }

    case 'ini': {
      let iniInput = markdownContent.replace(/```ini/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(iniInput), mimetype: 'text/plain' };
    }

    case 'properties': {
      let propsInput = markdownContent.replace(/```properties/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(propsInput), mimetype: 'text/plain' };
    }

    case 'svg': {
      let svgInput = markdownContent.replace(/```svg/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(svgInput), mimetype: 'image/svg+xml' };
    }

    case 'html5': {
      return { buffer: Buffer.from(htmlContent), mimetype: 'text/html' };
    }

    case 'xhtml': {
      let xhtmlContent = htmlContent.replace(/(\s)(\w+)=/g, '$1$2=').replace(/<br>/g, '<br/>');
      return { buffer: Buffer.from(xhtmlContent), mimetype: 'application/xhtml+xml' };
    }

    case 'astro': {
      let astroInput = markdownContent.replace(/```astro/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(astroInput), mimetype: 'text/plain' };
    }

    case 'jsx':
    case 'tsx': {
      let jsxInput = markdownContent.replace(/```jsx/gi, '').replace(/```tsx/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(jsxInput), mimetype: 'text/plain' };
    }

    case 'python':
    case 'py': {
      let pyInput = markdownContent.replace(/```python/gi, '').replace(/```py/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(pyInput), mimetype: 'text/plain' };
    }

    case 'javascript':
    case 'js': {
      let jsInput = markdownContent.replace(/```javascript/gi, '').replace(/```js/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(jsInput), mimetype: 'text/javascript' };
    }

    case 'typescript':
    case 'ts': {
      let tsInput = markdownContent.replace(/```typescript/gi, '').replace(/```ts/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(tsInput), mimetype: 'text/plain' };
    }

    case 'cpp':
    case 'c++': {
      let cppInput = markdownContent.replace(/```cpp/gi, '').replace(/```c\+\+/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(cppInput), mimetype: 'text/plain' };
    }

    case 'java': {
      let javaInput = markdownContent.replace(/```java/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(javaInput), mimetype: 'text/plain' };
    }

    case 'csharp':
    case 'cs': {
      let csInput = markdownContent.replace(/```csharp/gi, '').replace(/```cs/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(csInput), mimetype: 'text/plain' };
    }

    case 'golang':
    case 'go': {
      let goInput = markdownContent.replace(/```golang/gi, '').replace(/```go/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(goInput), mimetype: 'text/plain' };
    }

    case 'rust': {
      let rustInput = markdownContent.replace(/```rust/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(rustInput), mimetype: 'text/plain' };
    }

    case 'shell':
    case 'bash':
    case 'sh': {
      let shInput = markdownContent.replace(/```shell/gi, '').replace(/```bash/gi, '').replace(/```sh/gi, '').replace(/```/g, '').trim();
      if (!shInput.startsWith('#!/')) {
        shInput = '#!/bin/bash\n' + shInput;
      }
      return { buffer: Buffer.from(shInput), mimetype: 'text/plain' };
    }

    case 'ruby': {
      let rubyInput = markdownContent.replace(/```ruby/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(rubyInput), mimetype: 'text/plain' };
    }

    case 'php': {
      let phpInput = markdownContent.replace(/```php/gi, '').replace(/```/g, '').trim();
      if (!phpInput.startsWith('<?php')) {
        phpInput = '<?php\n' + phpInput;
      }
      return { buffer: Buffer.from(phpInput), mimetype: 'text/plain' };
    }

    case 'dockerfile': {
      let dockerInput = markdownContent.replace(/```dockerfile/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(dockerInput), mimetype: 'text/plain' };
    }

    case 'makefile': {
      let makeInput = markdownContent.replace(/```makefile/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(makeInput), mimetype: 'text/plain' };
    }

    case 'gradle': {
      let gradleInput = markdownContent.replace(/```gradle/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(gradleInput), mimetype: 'text/plain' };
    }

    case 'maven':
    case 'pom': {
      let pomInput = markdownContent.replace(/```maven/gi, '').replace(/```pom/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(pomInput), mimetype: 'application/xml' };
    }

    case 'dart': {
      let dartInput = markdownContent.replace(/```dart/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(dartInput), mimetype: 'text/plain' };
    }

    case 'kotlin': {
      let kotlinInput = markdownContent.replace(/```kotlin/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(kotlinInput), mimetype: 'text/plain' };
    }

    case 'swift': {
      let swiftInput = markdownContent.replace(/```swift/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(swiftInput), mimetype: 'text/plain' };
    }

    case 'groovy': {
      let groovyInput = markdownContent.replace(/```groovy/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(groovyInput), mimetype: 'text/plain' };
    }

    case 'latex':
    case 'tex': {
      let latexInput = markdownContent.replace(/```latex/gi, '').replace(/```tex/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(latexInput), mimetype: 'text/plain' };
    }

    case 'r': {
      let rInput = markdownContent.replace(/```r/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(rInput), mimetype: 'text/plain' };
    }

    case 'matlab': {
      let matlabInput = markdownContent.replace(/```matlab/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(matlabInput), mimetype: 'text/plain' };
    }

    case 'css': {
      let cssInput = markdownContent.replace(/```css/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(cssInput), mimetype: 'text/css' };
    }

    case 'scss': {
      let scssInput = markdownContent.replace(/```scss/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(scssInput), mimetype: 'text/plain' };
    }

    case 'less': {
      let lessInput = markdownContent.replace(/```less/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(lessInput), mimetype: 'text/plain' };
    }

    case 'graphql':
    case 'gql': {
      let gqlInput = markdownContent.replace(/```graphql/gi, '').replace(/```gql/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(gqlInput), mimetype: 'text/plain' };
    }

    case 'env': {
      let envInput = markdownContent.replace(/```env/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(envInput), mimetype: 'text/plain' };
    }

    case 'gitignore': {
      let gitInput = markdownContent.replace(/```gitignore/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(gitInput), mimetype: 'text/plain' };
    }

    case 'txt':
    default: {
      const textContent = markdownContent.replace(/```[a-z]*\n/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(textContent), mimetype: 'text/plain' };
    }
  }
};
