
const fs = require("node:fs");
const path = require("node:path");
const sass = require("sass");
const browserslist = require("browserslist");
const { transform, browserslistToTargets } = require("lightningcss");
//const { eleventyImageTransformPlugin } = require("@11ty/eleventy-img");

const Image = require("@11ty/eleventy-img")


// Set default transpiling targets
let browserslistTargets = "> 0.2% and not dead";

// Check for user's browserslist
try {
  const package = path.resolve(__dirname, fs.realpathSync("package.json"));
  const userPkgBrowserslist = require(package);

  if (userPkgBrowserslist.browserslist) {
    browserslistTargets = userPkgBrowserslist.browserslist;
  } else {
    try {
      const browserslistrc = path.resolve(
        __dirname,
        fs.realpathSync(".browserslistrc")
      );

      fs.readFile(browserslistrc, "utf8", (_err, data) => {
        if (data.length) {
          browserslistTargets = [];
        }

        data.split(/\r?\n/).forEach((line) => {
          if (line.length && !line.startsWith("#")) {
            browserslistTargets.push(line);
          }
        });
      });
    } catch (err) {
      // no .browserslistrc
    }
  }
} catch (err) {
  // no package browserslist
}

module.exports = (eleventyConfig) => {

  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("img");


  // Recognize Sass as a "template languages"
  eleventyConfig.addTemplateFormats("scss");

  // Compile Sass and process with LightningCSS
  eleventyConfig.addExtension("scss", {
    outputFileExtension: "css",
    compile: async function (inputContent, inputPath) {
      let parsed = path.parse(inputPath);
      if (parsed.name.startsWith("_")) {
        return;
      }

      let targets = browserslistToTargets(browserslist(browserslistTargets));

      let result = sass.compileString(inputContent, {
        loadPaths: [parsed.dir || "."],
        sourceMap: false,
      });

      this.addDependencies(inputPath, result.loadedUrls);

      return async () => {
        let { code } = await transform({
          code: Buffer.from(result.css),
          minify: true,
          sourceMap: false,
          targets,
        });
        return code;
      };
    },
  });



  // https://www.brycewray.com/posts/2021/04/using-eleventys-official-image-plugin/s
  // --- START, eleventy-img
  function imageShortcode(src, alt, sizes="(min-width: 1024px) 100vw, 50vw") {
    console.log(`Generating image(s) from:  ${src}`)
    let options = {
      widths: [600, 900, 1500],
      formats: ["auto"],
      urlPath: "/img/",
      outputDir: "./_site/img/",
      filenameFormat: function (id, src, width, format, options) {
        const extension = path.extname(src)
        const name = path.basename(src, extension)
        return `${name}-${width}w.${format}`
      }
    }

    // generate images
    Image(src, options)

    let imageAttributes = {
      alt,
      sizes,
      loading: "lazy",
      decoding: "async",
    }
    // get metadata
    metadata = Image.statsSync(src, options)
    return Image.generateHTML(metadata, imageAttributes)
  }
  eleventyConfig.addShortcode("image", imageShortcode)
  // --- END, eleventy-img






};
