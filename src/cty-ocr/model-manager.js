export class ModelManager {
  static GITHUB_OWNER = 'CraftThingy-Digital-Innovation';
  static GITHUB_REPO = 'cty-paddle-ocr-models';

  /**
   * Fetches the list of available model files and dictionaries in the GitHub models repository.
   * Works in both Web Browser and Node.js environments.
   */
  static async listAvailableModelsFromGithub() {
    try {
      const response = await fetch(`https://api.github.com/repos/${this.GITHUB_OWNER}/${this.GITHUB_REPO}/contents/`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models list from GitHub: ${response.status} ${response.statusText}`);
      }
      const files = await response.json();
      return files
        .filter(f => f.type === 'file' && (f.name.endsWith('.onnx') || f.name.endsWith('.ort') || f.name.endsWith('.txt')))
        .map(f => ({
          name: f.name,
          size: f.size,
          downloadUrl: `https://media.githubusercontent.com/media/${this.GITHUB_OWNER}/${this.GITHUB_REPO}/main/${f.name}`
        }));
    } catch (error) {
      console.error("Error listing models from GitHub:", error);
      throw error;
    }
  }

  /**
   * Downloads a model asset directly from the GitHub repository and saves it to a local folder.
   * Node.js (Server-side) environment only.
   */
  static async downloadModelFromGithub(fileName, destFolder) {
    if (typeof window !== 'undefined') {
      throw new Error("downloadModelFromGithub is only supported on Node.js/Server-side.");
    }
    
    // Dynamically import Node.js native core libraries to avoid bundling them for browsers
    const fs = await import('fs');
    const path = await import('path');
    const { Readable } = await import('stream');
    const { finished } = await import('stream/promises');

    const downloadUrl = `https://media.githubusercontent.com/media/${this.GITHUB_OWNER}/${this.GITHUB_REPO}/main/${fileName}`;
    const targetPath = path.join(destFolder, fileName);

    // Create target directory if missing
    if (!fs.existsSync(destFolder)) {
      fs.mkdirSync(destFolder, { recursive: true });
    }

    console.log(`[ModelManager] Downloading ${fileName} from GitHub LFS: ${downloadUrl}`);
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download model from GitHub: ${response.status} ${response.statusText}`);
    }

    const fileStream = fs.createWriteStream(targetPath);
    // Node.js Web Streams integration
    await finished(Readable.fromWeb(response.body).pipe(fileStream));
    console.log(`[ModelManager] Successfully saved model to ${targetPath}`);
    return targetPath;
  }
}
