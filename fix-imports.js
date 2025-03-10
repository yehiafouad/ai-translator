import("replace-in-file").then(({ replaceInFile }) => {
  const options = {
    files: "dist/**/*.js",
    from: /from\s+["'](\.{1,2}\/[^"']+?)(?<!\.js)["']/g, // Match imports without .js
    to: (_, path) => `from "${path}.js"`, // Append .js to the matched path
  };

  replaceInFile(options)
    .then(() => console.log("Imports fixed successfully!"))
    .catch((error) => console.error("Error fixing imports:", error));
});
