import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { minify } from 'html-minifier-terser';
import postcss from 'postcss';
import cssnano from 'cssnano';
import autoprefixer from 'autoprefixer';
import { minify as jsMinify } from 'terser';
import * as fs from "node:fs";

function htmlMinifier(html) {
	return new Promise((resolve, reject) => {
		minify(html, {
			removeComments: true,
			// 删除多余空格
			collapseWhitespace: true,
			collapseInlineTagWhitespace: true,
		}).then(res => {
            resolve(res);
        }).catch(err => {
            reject(err);
        });
	});
}

function cssMinifier(css) {
	return new Promise((resolve, reject) => {
		postcss(
            [autoprefixer, cssnano]
        ).process(css, {
            from: undefined
        }).then(res => {
            if (res.css) {
                resolve(res.css);
            } else {
                resolve('');
            }
        }).catch(err => {
            reject(err);
        });
	});
}


function jsMinifier(js) {
	return new Promise((resolve, reject) => {
        jsMinify(js, { module: true, keep_classnames: true, keep_fnames: true }).then(res => {
            if (res.code) {
                resolve(res.code);
            } else {
                resolve('');
            }
        }).catch(err => {
            reject(err);
        });
	});
}

(() => {
    const baseDir = path.dirname(fileURLToPath(import.meta.url));
    const directory = path.resolve(baseDir, 'build');
    const target = path.resolve(directory, 'generic');
    const create = path.resolve(directory, 'dist');
    function isDir (str) {
        return fs.statSync(str).isDirectory()
    }
    /**
     * @param {string} str 
     * @param {(s: string) => any} func 
     */
    async function recursive(str, func) {
        if (isDir(str)) {
            for (const name of fs.readdirSync(str)) {
                const child = path.resolve(str, name);
                await recursive(child, func);
            }
        } else {
            await func?.(str);
        }
    }
    if (fs.existsSync(create)) {
        fs.rmSync(create, { recursive: true });
    }
    /** @type { {encoding: 'utf-8'} } */
    const config = { encoding: 'utf-8' }
    recursive(target, async function (s) {
        const createPath = path.resolve(create, path.relative(target, s));
        if (!fs.existsSync(createPath)) {
            fs.mkdirSync(path.dirname(createPath), { recursive: true });
        }
        if (s.endsWith('.html')) {
            fs.writeFileSync(createPath, await htmlMinifier(fs.readFileSync(s, config)), config);
            console.log(`[html] ${s} 压缩成功`);
        } else if (s.endsWith('.js') || s.endsWith('.mjs')) {
            fs.writeFileSync(createPath, await jsMinifier(fs.readFileSync(s, config)), config);
            console.log(`[js] ${s} 压缩成功`);
        } else if (s.endsWith('.css')) {
            fs.writeFileSync(createPath, await cssMinifier(fs.readFileSync(s, config)), config);
            console.log(`[css] ${s} 压缩成功`);
        } else if (!s.endsWith('.mjs.map')) {
            fs.copyFileSync(s, createPath);
        }
    }).then(() => {
        console.log('压缩成功');
    })
})();
