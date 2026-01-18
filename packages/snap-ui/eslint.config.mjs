export default [
    {
        ignores: ["dist", "node_modules", "storybook-static", "**/*.ts", "**/*.tsx"]
    },
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: "module"
        },
        rules: {}
    }
];
