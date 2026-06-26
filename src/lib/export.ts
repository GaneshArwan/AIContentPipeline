import JSZip from "jszip";
import { PipelineState } from "@/types/pipeline";

export async function exportContentPackage(state: PipelineState, topic: string) {
  const zip = new JSZip();
  const folderName = topic.toLowerCase().replace(/\s+/g, "-");
  const folder = zip.folder(folderName);

  if (!folder) return;

  // 1. Article Markdown
  if (state.draft.output) {
    folder.file("article.md", state.draft.output.content);
  }

  // 2. SEO Metadata (JSON)
  if (state.seo.output) {
    folder.file("seo.json", JSON.stringify(state.seo.output, null, 2));
  }

  // 3. Social Media Content (Markdown)
  if (state.social.output) {
    const socialMd = `
# Social Media Content

## Twitter Thread
${state.social.output.twitterThread.map((t, i) => `${i + 1}. ${t}`).join("\n\n")}

## LinkedIn Post
${state.social.output.linkedInPost}

## Email Subject Lines
${state.social.output.emailSubjectLines.map(s => `- ${s}`).join("\n")}
    `.trim();
    folder.file("social.md", socialMd);
  }

  // 4. Research & Outline (JSON)
  if (state.research.output) {
    folder.file("research.json", JSON.stringify(state.research.output, null, 2));
  }
  if (state.outline.output) {
    folder.file("outline.json", JSON.stringify(state.outline.output, null, 2));
  }

  const content = await zip.generateAsync({ type: "blob" });
  
  // Native download trick without file-saver
  const url = window.URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${folderName}-package.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
