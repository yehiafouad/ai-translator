import("replace-in-file").then(({ replaceInFile }) => {
  const options = {
    files: "dist/**/*.js",
    from: /from\s+["'](\.\/[^\s]+)(?<!\.js)["']/g, // Ensure it doesn't append `.js` to already existing .js imports
    to: (match, p1) => {
      if (!p1.endsWith(".js")) {
        return `from "${p1}.js"`;
      }
      return match;
    },
  };

  replaceInFile(options).catch((error) =>
    console.error("Error fixing imports:", error)
  );
});
