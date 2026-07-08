```markdown
# SmartRoute Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns used in the SmartRoute repository, a JavaScript codebase built with the Express framework. You'll learn about file naming conventions, import/export styles, commit message patterns, and how to write and organize tests. This guide will help you contribute code that aligns with the project's established standards.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `userController.js`, `routeHandler.js`

### Imports
- Use **relative imports** for all modules.
  - Example:
    ```js
    import { getUser } from './userService.js';
    ```

### Exports
- Use **named exports** for functions, objects, or classes.
  - Example:
    ```js
    // userService.js
    export function getUser(id) { ... }
    export const USER_ROLE = 'admin';
    ```

### Commit Messages
- Prefix commit messages with `feat` for new features.
- Commit messages are concise, averaging around 40 characters.
  - Example: `feat: add user authentication middleware`

## Workflows

### Adding a New Feature
**Trigger:** When implementing new functionality.
**Command:** `/add-feature`

1. Create a new file using camelCase naming.
2. Write your module using named exports.
3. Import dependencies using relative paths.
4. Write tests in a corresponding `.test.js` file.
5. Commit your changes with a `feat:` prefix.
6. Open a pull request for review.

### Refactoring Existing Code
**Trigger:** When improving or restructuring existing code.
**Command:** `/refactor-code`

1. Identify the target file(s).
2. Refactor code, maintaining camelCase file names and named exports.
3. Update imports if file names or locations change.
4. Ensure all related tests still pass.
5. Commit with a descriptive message (e.g., `feat: refactor user service`).

## Testing Patterns

- Test files follow the pattern: `*.test.*` (e.g., `userService.test.js`)
- The specific testing framework is not specified; follow existing test file structure.
- Place test files alongside the modules they test or in a dedicated test directory.
- Example test file:
  ```js
  // userService.test.js
  import { getUser } from './userService.js';

  describe('getUser', () => {
    it('should return user data for valid id', () => {
      // test implementation
    });
  });
  ```

## Commands
| Command         | Purpose                                   |
|-----------------|-------------------------------------------|
| /add-feature    | Start the workflow for adding new features |
| /refactor-code  | Begin the code refactoring workflow        |
```
