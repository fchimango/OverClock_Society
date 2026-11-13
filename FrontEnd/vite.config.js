import { cpSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const frontendRoot = dirname(fileURLToPath(import.meta.url));
const outputDirectory = resolve(frontendRoot, "dist");

/**
 * Copia as páginas e os arquivos do frontend legado para o build.
 * Somente html/index.html será compilado pelo Vite nesta etapa.
 * As demais páginas continuam usando seus HTML/CSS/JS atuais.
 */
function copyLegacyFrontend() {
    return {
        name: "ocs-copy-legacy-frontend",
        apply: "build",
        closeBundle() {
            mkdirSync(outputDirectory, { recursive: true });

            for (const directory of ["css", "js"]) {
                const source = resolve(frontendRoot, directory);
                if (existsSync(source)) {
                    cpSync(source, resolve(outputDirectory, directory), {
                        recursive: true,
                        filter: (entry) => {
                            const normalized = entry.replaceAll("\\", "/");
                            return !normalized.endsWith("/index-vue.js")
                                && !normalized.endsWith("/index-components.js");
                        }
                    });
                }
            }

            const htmlSource = resolve(frontendRoot, "html");
            if (existsSync(htmlSource)) {
                cpSync(htmlSource, resolve(outputDirectory, "html"), {
                    recursive: true,
                    filter: (entry) => resolve(entry) !== resolve(htmlSource, "index.html")
                });
            }

            // Mantém as páginas de entrada e redirecionamento utilizadas pelo site atual.
            for (const file of ["index.html", "login.html", "cadastro.html"]) {
                const source = resolve(frontendRoot, file);
                if (existsSync(source)) {
                    copyFileSync(source, resolve(outputDirectory, file));
                }
            }
        }
    };
}

export default defineConfig({
    root: frontendRoot,
    base: "./",
    publicDir: false,
    plugins: [vue(), copyLegacyFrontend()],
    server: {
        host: "127.0.0.1",
        port: 5500,
        strictPort: true,
        open: "/html/index.html"
    },
    preview: {
        host: "127.0.0.1",
        port: 4173,
        strictPort: true
    },
    build: {
        outDir: outputDirectory,
        emptyOutDir: true,
        rolldownOptions: {
            input: resolve(frontendRoot, "html/index.html")
        }
    }
});
