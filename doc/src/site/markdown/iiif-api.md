# The digilib IIIF API

## IIIF Image API

The Scaler servlet provides not only its native [Scaler API](scaler-api.html) but also an API 
compliant to the standards of the International Image Interoperability Framework http://iiif.io.

As of version 2.11 digilib supports the [IIIF Image API](https://iiif.io/api/image/) 
up to [version 3](https://iiif.io/api/image/3.0/) 
at [compliance level 2](https://iiif.io/api/image/3.0/compliance/). You can specify the
API version by adding `/1/`, `/2/`, or `/3/` to the `iiif-prefix` or select the default API version 
when it is not specified
with the `iiif-api-version` parameter in [digilib-config](digilib-config.html) 

IIIF Image API URLs for an image request have the form:

    http[s]://{server}/{digilib-webapp}/Scaler/{iiif-prefix}/{identifier}/{region}/{size}/{rotation}/{quality}.{format} 

where `digilib-webapp` is the name of the digilib web application in the servlet container. 

The value of `iiif-prefix` is defined by the `iiif-prefix` parameter in [digilib-config](digilib-config.html). 
The default value is "IIIF". You can optionally specify the the IIIF API version by appending `/1/`, `/2/`, or `/3/`
to the prefix.

The `identifier` part of the URL must not contain slashes. Since the identifier is mapped to the digilib 
fn-parameter, which is a filesystem path that likely contains slashes separating subdirectories, all 
occurrences of a slash have to be replaced by the value of the `iiif-slash-replacement` parameter in 
[digilib-config](digilib-config.html). The default value of the replacement string is "!", so the fn-path
 "books/book1/page0002" becomes the identifier "books!book1!page0002".

For a definition of the other parameters `region`, `size`, `rotation`, `quality`, and `format` please 
see the [IIIF Image API docs](http://iiif.io/api/image/2.0/).

A IIIF Image API image request URL could look like:

    http://www.example.org/digilib/Scaler/IIIF/2/books!book1!page0002/full/!150,75/0/default.jpg

An info request URL for the same image looks like: 

    http://www.example.org/digilib/Scaler/IIIF/2/books!book1!page0002/info.json

## IIIF Presentation API

As of version 2.11 digilib provides the additional Manifester servlet that generates simple 
[IIIF Presentation API](http://iiif.io/api/presentation/) version 2 and version 3 manifests that can 
be used with any [IIIF viewer](http://iiif.io/apps-demos/#image-viewing-clients) to navigate 
a directory full of images with the functions of a book-reader or light-table.

The Manifester servlet URLs have the form:

    http[s]://{server}/{digilib-webapp}/Manifester/{iiif-prefix}/{identifier}

The value of `iiif-prefix` is defined by the `iiif-prefix` parameter in [digilib-config](digilib-config.html). 
The default value is "IIIF". You can optionally specify the the IIIF API version by appending `/2/`, or `/3/`
to the prefix.

So you can get a (version 3) manifest for all images in the directory `/books/book1` with a URL like:

    http://www.example.org/digilib/Manifester/IIIF/3/books!book1

To try out a viewer on your manifest you can go to the website of the Universal Viewer 
[http://universalviewer.io/](http://universalviewer.io/) and enter the URL of your manifest 
in the "view a manifest" box on the page. This will work even with a local digilib 
installation since the Javascript in your Browser reads and interprets the manifest.

The minimal information in the manifest can be enhanced with additional metadata or the replaced 
by a custom manifest. If the servlet finds a file with the name

    manifest.json

in a directory then the contents of that file are sent instead of an auto-generated manifest.
This works also in directories with no images so you could put a file with 
[collection](http://iiif.io/api/presentation/2.1/#collection) information in a higher-level directory.

If the servlet finds a file with the name

    manifest-meta.json
    
in a directory with images then the contents of that file are added to the top-level manifest
(`@context`, `@type`, `@id`, `sequences` are ignored). You can use this to add real bibliographical
information to the manifest.

The configuration parameter `iiif-manifest-page-label` determines the format of the label of each image:
the value `filename` uses the image file name (default, sans extension), `index` uses the index (counting from 1).

Additional configuration parameters can optionally be used to fix the generation of URLs in the IIIF presentation
API output when running behind a proxy that changes URL paths:

* `iiif-manifest-base-url`: base URL used in constructing IIIF manifests including servlet name and iiif-prefix
* `webapp-base-url`: web-application base URL used in constructing API paths
* `scaler-servlet-name`: Scaler servlet name used in constructing IIIF image API paths

