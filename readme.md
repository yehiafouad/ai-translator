# AI Translator

### Overview

AI Translator is a tool designed to translate content into different languages using advanced AI models. It automates the translation process and organizes the translated files within the same directory structure as the original content.

### Table of Contents

1. Installation
2. Usage
3. Configuration
4. Contributing
5. License

### Installation

##### Prerequisites

Before setting up the AI Translator, ensure you have the following installed:

- Node.js
- yarn

##### Steps

1. Clone the repository:
   git clone https://github.com/yehiafouad/ai-translator.git
2. Navigate to the project directory:
   `cd ai-translator`
3. Install dependencies:
   `yarn install`

#### Usage

To start using AI Translator, run the following command:
`yarn start -s /path/to/file/or/folder -p ios/android/portal -l hi/fr/ur`

- `-s` - Source directory (Required)
- `-p` - Platform of the source path (Optional)
- `-l` - Target Language that need to translate (Optional)

#### Features

- **Multi-language Support**: Translate content into multiple languages with ease.

- **Directory Structure Preservation**: Translated files are saved in the same directory structure as the source files.

- **Customizable**: Configure translation settings to suit your needs.

### Configuration

AI Translator can be customized using a configuration file. Create a `.env` file in the root directory with the following variables:

- `API_KEY`: Your API key for the translation service.
- `DEFAULT_LANGUAGE`: The default language for translations.

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Contact

For questions or support, please contact [yehiafouad.yf@gmail.com](mailto:yehiafouad.yf@gmail.com).
