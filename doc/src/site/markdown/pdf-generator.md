# PDF generator

The digilib `PDFGenerator` servlet creates custom PDF documents from images on the server 
for download by the user. The user can specify the sequence of images, the image resolution
and information for the generated cover page of the document. The frontend will reload
the status page until the document has been generated and then download the document.
Generated documents will be cached on the server to speed up subsequent requests for the same document.

## Installation

The `PDFGenerator` servlet and its frontend are built by the `pdf` and `frontend-pdf` modules.
You can add both to the [manual build process](build-maven.html) using the `-Ppdf` option but it is
easier to include the generated artifacts the `pom.xml` of your own Maven project:

```
<dependency>
  <groupId>digilib</groupId>
  <artifactId>digilib-frontend-pdf</artifactId>
  <version>2.10.0</version>
  <type>war</type>
  <scope>runtime</scope>
</dependency>
```

(see https://github.com/robcast/digilib-frontend-template for a basic setup)

## Request

The `PDFGenerator` servlet accepts the first request as a HTTP POST request with the following parameters:

`fn`
: image directory path name (required)

`pgs`
: image sequence specification (required) examples: "1-" (all pages), "1-5", "5,10,15", "1-7,9-13"

`dw`
: pixel image width (optional)

`dh`
: pixel image height (optional, default 500)

`logo`
: url of header logo for cover page (optional)

`header-title`
: header title for cover page (optional)

`header-subtitle`
: header subtitle for cover page (optional)

`title`
: document title for cover page (optional)

`author`
: document author for cover page (optional)

`date`
: document date for cover page (optional)

`reference`
: document full reference for cover page (optional, alternative to title, author, date)

`online-url`
: footer online url for cover page (optional)

The very simple but functional HTML form `/pdf/form.jsp` can be used as a starting point for customization.

The response to the first post request is a redirect to a HTTP GET request with an added `docid`
parameter identifying the requested document. The following GET requests must provide the `docid`
parameter and the response will be either a work-in-progress waiting page, an error page or the final document
download.

The `PDFGenerator` servlet can also be queried as a ReST-style API. Responses will be given as 
JSON documents with the keys `docid`, `status` and `message` if the request carries the `Accept`
header value `application/json`.

## iText PDF license

The `PDFGenerator` servlet uses the [iText PDF library](https://itextpdf.com). 
You can use it either under an [AGPL license](https://itextpdf.com/en/how-buy/agpl-license)
or request a commercial license from the vendor.
