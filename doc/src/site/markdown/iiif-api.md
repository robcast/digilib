# The digilib IIIF API

The Scaler servlet provides not only its native [Scaler API](scaler-api.html) but also an API compliant to the standards of the International Image Interoperability Framework http://iiif.io.

As of version 2.3 digilib supports the [IIIF Image API version 1.1](http://iiif.io/api/image/1.1/) at [compliance level 2](http://iiif.io/api/image/1.1/compliance.html) (since V2.3.3 even for forced w,h sizes where the image will be distorted).

IIIF Image API URLs for an image request have the form:

    http[s]://server/digilib-webapp/Scaler/iiif-prefix/identifier/region/size/rotation/quality[.format] 

where `digilib-webapp` is the name of the digilib web application in the servlet container. 

The value of `iiif-prefix` is defined by the `iiif-prefix` parameter in the [digilib-config](digilib-config.html). The default value is "IIIF".

The `identifier` part of the URL must not contain slashes. Since the identifier is mapped to the digilib fn-parameter, which is a filesystem path that likely contains slashes separating subdirectories, all occurrences of a slash have to be replaced by the value of the `iiif-slash-replacement` parameter in [digilib-config](digilib-config.html). The default value of the replacement string is "!", so the fn-path "books/book1/page0002" becomes the identifier "books!book1!page0002".

For a definition of the other request parameters `region`, `size`, `rotation`, `quality`, and `format` please see the [IIIF Image API docs](http://iiif.io/api/image/1.1/).

A IIIF Image API image request URL could look like:

    http://www.example.org/digilib/Scaler/IIIF/books!book1!page0002/full/!150,75/0/native.jpg

An info request URL for the same image looks like: 

    http://www.example.org/digilib/Scaler/IIIF/books!book1!page0002/info.json
