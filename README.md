# Wordpress-xml-to-contentstack-converter

Built.io Contentstack is a headless CMS with an API-first approach that puts content at the centre. It is designed to simplify the process of publication by separating code from content.

This project (export script) allows you to export content from WordPress into an XML file and prepare it to be imported into Built.io Contentstack. Using this project you can easily export WordPress Users (authors), Categories, Media (assets), and Posts and convert them into a format suitable to be imported into Built.io Contentstack.

## Setup and installation
 1. Download this project and run the command given below in a terminal:

    ```bash
    npm install
    ```

    This command will install the required node modules on your system.
 2. [Export](https://en.support.wordpress.com/export/) WordPress content into an XML file from the WordPress admin panel.
 3. Pass the absolute path of the file to the 'xml_filename' key in the config file.

## Export modules
After performing the above steps, you need to export modules. You can either add all modules or only specific modules to suit your requirements.

### Export all modules
Run the command given below to export all the modules:

```
  npm run export
```

This command will extract data of authors, assets, categories, and posts from the downloaded XML file and convert them in JSON files that is supported in Built.io Contentstack. These files are stored in the path mentioned in the 'data' key in the 'config/index.js' file.

### Export specific module
Run the command given below to export specific modules:

```
  npm run export <<module name>>
 ```

The sequence of modules to be exported can be as follows:
 1. assets
 2. authors
 3. categories
 4. posts

## Log
You can find the logs of the export process under libs/utils/logs. The files included are 'success' and 'error'. Successfully run processes are recorded under 'success' and the errors under 'errors'.

The logs for failed Media(assets) are recorded in 'wp_failed.json' and is stored under the 'master' folder located where your exported data resides.

## Import content
Copy the 'contenttype' folder from your project and paste it in the path mentioned in the 'data' key within the 'config/index.js' file. The 'contentType' folder consist of the basic schema of content types which will help you to migrate your data.

Now, run the [contentstack-importer](https://github.com/builtio-contentstack/contentstack-import) script to import the content to Built.io Contentstack.

### Known issues

 1. The internal links will not be updated.
 2. There is no provision to migrate authors' profile pictures or their social profile details, comments on posts, and pages.
 3. The author count in XML and MySQL export files are different.
 4. In XML-based export process, if the version of WordPress is lower than 4, the category description and parent details will be absent.
 5. Only published posts will be migrated.

## License
This project is covered under MIT license.


