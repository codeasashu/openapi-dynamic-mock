import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const config = {
  specdir: path.join(__filename, "..", "specs"),
};

export default config;
