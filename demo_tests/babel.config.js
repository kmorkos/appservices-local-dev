module.exports = {
  presets: [
    ["@babel/preset-env", { targets: { node: "current" } }],
    "@babel/preset-typescript",
  ],
  plugins: [
    [
      "../babel-context-transform/dist/index.js",
      {
        datasources: {
          "mongodb-atlas": "mongodb://localhost:27017",
        },
        values: {
          db: "db",
          coll: "Dog",
        },
      },
    ],
  ],
};
