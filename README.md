# Fields Builder For Google APIs

<a name="top"></a>
[![MIT License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENCE)

![](images/demo.gif)

<a name="overview"></a>

# Overview

**[FieldsBuilderForGoogleAPIs](https://sites.google.com/view/fields-builder) is a Web Application for building the `fields` parameter for Google APIs.**

When using Google APIs, specifying the `fields` parameter allows you to retrieve only the data you need (Partial Response). This improves performance and reduces data usage. However, constructing this parameter manually can be complex, especially for deeply nested resources. This tool automates that process.

# Features

-   **Support for ALL Google APIs**: Dynamically loads the latest API discovery documents.
-   **Nested Resources**: Fully supports APIs with deep resource hierarchies (e.g., Drive, Sheets).
-   **Optimized Fields Generation**: Select a parent node to automatically include all its children in the fields string.
-   **Modern UI**: Clean, dark-themed interface for better usability.
-   **Standalone**: Runs entirely in the browser. No server-side code, no authorization, and no scopes required.

# Usage

1.  Access [https://sites.google.com/view/fields-builder](https://sites.google.com/view/fields-builder) using your web browser.
2.  **Search/Select API**: Type to search or select an API from the dropdown (e.g., "Google Drive API").
3.  **Select Resource**: Choose the resource you want to access (e.g., `files`).
4.  **Select Method**: Choose the method (e.g., `list`).
5.  **Select Fields**:
    -   The response schema will be displayed as a tree.
    -   Check the boxes for the fields you want to retrieve.
    -   Selecting a parent node (e.g., `userEnteredValue`) will include it in the output, implying all its sub-fields.
6.  **Copy**: Click the "Copy" button to copy the generated string to your clipboard.
7.  **Paste**: Use the copied string as the value for the `fields` parameter in your API request.

# Description

After the Google API Explorer was updated, it became harder to visually construct the `fields` parameter. This tool bridges that gap. It parses the official Discovery documents to build an interactive tree view of the response schema.

# URL of this web application

[https://sites.google.com/view/fields-builder](https://sites.google.com/view/fields-builder)

---

<a name="licence"></a>

# Licence

[MIT](LICENCE)

<a name="author"></a>

# Author

[Tanaike](https://tanaikech.github.io/)

[Donate](https://tanaikech.github.io/donate/)

<a name="updatehistory"></a>

# Update History

-   v1.0.0 (March 4, 2020)
    -   Initial release.

-   v2.0.0 (November 23, 2025)
    -   Refactored core logic to support all Google APIs.
    -   Fixed issues with circular references (e.g., Docs API).
    -   Implemented recursive resource traversal.
    -   Complete UI overhaul with Dark Mode.
    -   Optimized fields string generation.

[TOP](#top)
