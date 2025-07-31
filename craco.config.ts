import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";

module.exports = function () {
  return {
    webpack: {
      plugins:
        process.env.ANALYZE?.trim().toLowerCase() === "true"
          ? [new BundleAnalyzerPlugin({ analyzerMode: "server" })]
          : [],
    },
  };
};
