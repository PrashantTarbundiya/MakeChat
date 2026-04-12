import { marked } from 'marked';
import { default as HTMLToDOCX } from 'html-to-docx';
import puppeteer from 'puppeteer';

export const generateFileBuffer = async (markdownContent, fileType) => {
  console.log(`[FileGenerator] Starting generation for type: ${fileType}, content length: ${markdownContent.length}`);
  
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
        console.log('[FileGenerator] Launching Puppeteer for PDF generation...');
        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } });
        console.log(`[FileGenerator] PDF generated successfully: ${pdfBuffer.length} bytes`);
        return { buffer: Buffer.from(pdfBuffer), mimetype: 'application/pdf' };
      } finally {
        if (browser) await browser.close();
      }
    }
    
    case 'docx': {
      try {
        console.log('[FileGenerator] Generating DOCX file...');
        const docxBuffer = await HTMLToDOCX(htmlContent, null, {
          table: { row: { cantSplit: true } },
          footer: true,
          pageNumber: true
        });
        console.log(`[FileGenerator] DOCX generated successfully: ${docxBuffer.length} bytes`);
        return { buffer: Buffer.from(docxBuffer), mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
      } catch (e) {
        console.error('[FileGenerator] DOCX generation error:', e);
        throw e;
      }
    }
    
    case 'html': {
      console.log('[FileGenerator] Generating HTML file...');
      return { buffer: Buffer.from(htmlContent), mimetype: 'text/html' };
    }

    case 'json': {
      console.log('[FileGenerator] Generating JSON file...');
      let jsonInput = markdownContent.replace(/```json/gi, '').replace(/```/g, '').trim();
      try {
        const parsed = JSON.parse(jsonInput);
        jsonInput = JSON.stringify(parsed, null, 2);
      } catch (e) {
        console.log('[FileGenerator] Using raw JSON (not valid JSON format)');
      }
      return { buffer: Buffer.from(jsonInput), mimetype: 'application/json' };
    }
    
    case 'csv': {
      console.log('[FileGenerator] Generating CSV file...');
      let csvInput = markdownContent.replace(/```csv/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(csvInput), mimetype: 'text/csv' };
    }
    
    case 'tsv': {
      console.log('[FileGenerator] Generating TSV file...');
      let tsvInput = markdownContent.replace(/```tsv/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(tsvInput), mimetype: 'text/tab-separated-values' };
    }
    
    case 'xml': {
      console.log('[FileGenerator] Generating XML file...');
      let xmlInput = markdownContent.replace(/```xml/gi, '').replace(/```/g, '').trim();
      if (!xmlInput) {
        console.warn('[FileGenerator] Empty XML input, using original content');
        xmlInput = markdownContent;
      }
      const xmlBuffer = Buffer.from(xmlInput, 'utf8');
      console.log(`[FileGenerator] XML buffer: ${xmlBuffer.length} bytes`);
      return { buffer: xmlBuffer, mimetype: 'application/xml' };
    }
    
    case 'yaml':
    case 'yml': {
      console.log('[FileGenerator] Generating YAML file...');
      let yamlInput = markdownContent.replace(/```yaml/gi, '').replace(/```yml/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(yamlInput, 'utf8'), mimetype: 'text/yaml' };
    }
    
    case 'md':
    case 'markdown': {
      console.log('[FileGenerator] Generating Markdown file...');
      const mdBuffer = Buffer.from(markdownContent, 'utf8');
      console.log(`[FileGenerator] Markdown buffer: ${mdBuffer.length} bytes`);
      return { buffer: mdBuffer, mimetype: 'text/markdown' };
    }

    case 'sql': {
      console.log('[FileGenerator] Generating SQL file...');
      let sqlInput = markdownContent.replace(/```sql/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(sqlInput), mimetype: 'text/plain' };
    }

    case 'jsonl':
    case 'ndjson': {
      console.log('[FileGenerator] Generating JSONL file...');
      let jsonlInput = markdownContent.replace(/```jsonl/gi, '').replace(/```ndjson/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(jsonlInput), mimetype: 'application/x-jsonlines' };
    }

    case 'toml': {
      console.log('[FileGenerator] Generating TOML file...');
      let tomlInput = markdownContent.replace(/```toml/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(tomlInput), mimetype: 'text/plain' };
    }

    case 'ini': {
      console.log('[FileGenerator] Generating INI file...');
      let iniInput = markdownContent.replace(/```ini/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(iniInput), mimetype: 'text/plain' };
    }

    case 'properties': {
      console.log('[FileGenerator] Generating Properties file...');
      let propsInput = markdownContent.replace(/```properties/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(propsInput), mimetype: 'text/plain' };
    }

    case 'svg': {
      console.log('[FileGenerator] Generating SVG file...');
      let svgInput = markdownContent.replace(/```svg/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(svgInput), mimetype: 'image/svg+xml' };
    }

    case 'html5': {
      console.log('[FileGenerator] Generating HTML5 file...');
      return { buffer: Buffer.from(htmlContent), mimetype: 'text/html' };
    }

    case 'xhtml': {
      console.log('[FileGenerator] Generating XHTML file...');
      let xhtmlContent = htmlContent.replace(/(\s)(\w+)=/g, '$1$2=').replace(/<br>/g, '<br/>');
      return { buffer: Buffer.from(xhtmlContent), mimetype: 'application/xhtml+xml' };
    }

    case 'astro': {
      console.log('[FileGenerator] Generating Astro file...');
      let astroInput = markdownContent.replace(/```astro/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(astroInput), mimetype: 'text/plain' };
    }

    case 'jsx':
    case 'tsx': {
      console.log('[FileGenerator] Generating JSX/TSX file...');
      let jsxInput = markdownContent.replace(/```jsx/gi, '').replace(/```tsx/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(jsxInput), mimetype: 'text/plain' };
    }

    case 'python':
    case 'py': {
      console.log('[FileGenerator] Generating Python file...');
      let pyInput = markdownContent.replace(/```python/gi, '').replace(/```py/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(pyInput), mimetype: 'text/plain' };
    }

    case 'javascript':
    case 'js': {
      console.log('[FileGenerator] Generating JavaScript file...');
      let jsInput = markdownContent.replace(/```javascript/gi, '').replace(/```js/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(jsInput), mimetype: 'text/javascript' };
    }

    case 'typescript':
    case 'ts': {
      console.log('[FileGenerator] Generating TypeScript file...');
      let tsInput = markdownContent.replace(/```typescript/gi, '').replace(/```ts/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(tsInput), mimetype: 'text/plain' };
    }

    case 'cpp':
    case 'c++': {
      console.log('[FileGenerator] Generating C++ file...');
      let cppInput = markdownContent.replace(/```cpp/gi, '').replace(/```c\+\+/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(cppInput), mimetype: 'text/plain' };
    }

    case 'java': {
      console.log('[FileGenerator] Generating Java file...');
      let javaInput = markdownContent.replace(/```java/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(javaInput), mimetype: 'text/plain' };
    }

    case 'csharp':
    case 'cs': {
      console.log('[FileGenerator] Generating C# file...');
      let csInput = markdownContent.replace(/```csharp/gi, '').replace(/```cs/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(csInput), mimetype: 'text/plain' };
    }

    case 'golang':
    case 'go': {
      console.log('[FileGenerator] Generating Go file...');
      let goInput = markdownContent.replace(/```golang/gi, '').replace(/```go/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(goInput), mimetype: 'text/plain' };
    }

    case 'rust': {
      console.log('[FileGenerator] Generating Rust file...');
      let rustInput = markdownContent.replace(/```rust/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(rustInput), mimetype: 'text/plain' };
    }

    case 'shell':
    case 'bash':
    case 'sh': {
      console.log('[FileGenerator] Generating Shell script file...');
      let shInput = markdownContent.replace(/```shell/gi, '').replace(/```bash/gi, '').replace(/```sh/gi, '').replace(/```/g, '').trim();
      if (!shInput.startsWith('#!/')) {
        shInput = '#!/bin/bash\n' + shInput;
      }
      return { buffer: Buffer.from(shInput), mimetype: 'text/plain' };
    }

    case 'ruby': {
      console.log('[FileGenerator] Generating Ruby file...');
      let rubyInput = markdownContent.replace(/```ruby/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(rubyInput), mimetype: 'text/plain' };
    }

    case 'php': {
      console.log('[FileGenerator] Generating PHP file...');
      let phpInput = markdownContent.replace(/```php/gi, '').replace(/```/g, '').trim();
      if (!phpInput.startsWith('<?php')) {
        phpInput = '<?php\n' + phpInput;
      }
      return { buffer: Buffer.from(phpInput), mimetype: 'text/plain' };
    }

    case 'dockerfile': {
      console.log('[FileGenerator] Generating Dockerfile...');
      let dockerInput = markdownContent.replace(/```dockerfile/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(dockerInput), mimetype: 'text/plain' };
    }

    case 'makefile': {
      console.log('[FileGenerator] Generating Makefile...');
      let makeInput = markdownContent.replace(/```makefile/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(makeInput), mimetype: 'text/plain' };
    }

    case 'gradle': {
      console.log('[FileGenerator] Generating Gradle file...');
      let gradleInput = markdownContent.replace(/```gradle/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(gradleInput), mimetype: 'text/plain' };
    }

    case 'maven':
    case 'pom': {
      console.log('[FileGenerator] Generating Maven POM file...');
      let pomInput = markdownContent.replace(/```maven/gi, '').replace(/```pom/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(pomInput), mimetype: 'application/xml' };
    }

    case 'dart': {
      console.log('[FileGenerator] Generating Dart file...');
      let dartInput = markdownContent.replace(/```dart/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(dartInput), mimetype: 'text/plain' };
    }

    case 'kotlin': {
      console.log('[FileGenerator] Generating Kotlin file...');
      let kotlinInput = markdownContent.replace(/```kotlin/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(kotlinInput), mimetype: 'text/plain' };
    }

    case 'swift': {
      console.log('[FileGenerator] Generating Swift file...');
      let swiftInput = markdownContent.replace(/```swift/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(swiftInput), mimetype: 'text/plain' };
    }

    case 'groovy': {
      console.log('[FileGenerator] Generating Groovy file...');
      let groovyInput = markdownContent.replace(/```groovy/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(groovyInput), mimetype: 'text/plain' };
    }

    case 'latex':
    case 'tex': {
      console.log('[FileGenerator] Generating LaTeX file...');
      let latexInput = markdownContent.replace(/```latex/gi, '').replace(/```tex/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(latexInput), mimetype: 'text/plain' };
    }

    case 'r': {
      console.log('[FileGenerator] Generating R script file...');
      let rInput = markdownContent.replace(/```r/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(rInput), mimetype: 'text/plain' };
    }

    case 'matlab': {
      console.log('[FileGenerator] Generating MATLAB file...');
      let matlabInput = markdownContent.replace(/```matlab/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(matlabInput), mimetype: 'text/plain' };
    }

    case 'css': {
      console.log('[FileGenerator] Generating CSS file...');
      let cssInput = markdownContent.replace(/```css/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(cssInput), mimetype: 'text/css' };
    }

    case 'scss': {
      console.log('[FileGenerator] Generating SCSS file...');
      let scssInput = markdownContent.replace(/```scss/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(scssInput), mimetype: 'text/plain' };
    }

    case 'less': {
      console.log('[FileGenerator] Generating LESS file...');
      let lessInput = markdownContent.replace(/```less/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(lessInput), mimetype: 'text/plain' };
    }

    case 'graphql':
    case 'gql': {
      console.log('[FileGenerator] Generating GraphQL file...');
      let gqlInput = markdownContent.replace(/```graphql/gi, '').replace(/```gql/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(gqlInput), mimetype: 'text/plain' };
    }

    case 'env': {
      console.log('[FileGenerator] Generating .env file...');
      let envInput = markdownContent.replace(/```env/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(envInput), mimetype: 'text/plain' };
    }

    case 'gitignore': {
      console.log('[FileGenerator] Generating .gitignore file...');
      let gitInput = markdownContent.replace(/```gitignore/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(gitInput), mimetype: 'text/plain' };
    }

    case 'txt':
    default: {
      console.log('[FileGenerator] Generating Text file...');
      const textContent = markdownContent.replace(/```[a-z]*\n/gi, '').replace(/```/g, '').trim();
      return { buffer: Buffer.from(textContent), mimetype: 'text/plain' };
    }
  }
};
