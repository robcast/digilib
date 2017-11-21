# Configuring digilib

The main configuration for *digilib* is the XML file `digilib-config.xml` in the
`WEB-INF` directory of the webapp. Alternatively you can also use a Java properties 
file `digilib.properties` somewhere in the classpath.
(If you really need a different location for the XML file you can define it in
the `config-file` init-parameter to the Servlet. **TODO** add an example)

In the configuration file you can set lots of paths and options. *digilib* uses
default values for all configuration settings that meet most requirements.
Hence you have to configure only the settings that you want to change. The
**`basedir-list`** parameter however is **mandatory** unless you only want to serve
the contributed example images for an evaluation.

All options are defined as `parameter` elements with the attributes `name` and
`value` that are wrapped in the root element `digilib-config`. A minimal
configuration looks like this:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<digilib-config>
    <parameter name="basedir-list" value="/usr/local/images" />
</digilib-config>
```

A more extensive example is included in the sources as
[digilib-config.xml.template](https://github.com/robcast/digilib/blob/master/webapp/src/main/webapp/WEB-INF/digilib-config.xml.template).


## Available parameters

The documented parameter values below are the defaults.

If relative paths are provided as file locations, these will be resolved with
the web application's directory as base.

You can inspect a summary of your running digilib configuration at the URL
`<base_url>/server/dlConfig.jsp` e.g. <http://localhost:8080/digilib/server/dlConfig.jsp>.

### Image locations

```xml
<parameter name="basedir-list" value="sample-images" />
```

A list of directories where images are searched. See
[this document](image-directories.html) for details (**required**).

```xml
<parameter name="denied-image" value="img/digilib-denied.png" />
```

This image is sent to indicate an authorization failure.

```xml
<parameter name="error-image" value="img/digilib-error.png" />
```

This image is sent to indicate a general failure.

```xml
<parameter name="notfound-image" value="img/digilib-notfound.png" />
```

This image to sent to indicate that the requested image does not exist or could not be read.

```xml
<parameter name="use-mapping" value="false" />
```

Enables the mapping of 'virtual directories' to actual directories in the
filesystem using a mapping file.

```xml
<parameter name="mapping-file" value="digilib-map.xml" />
```

The location of the mapping file. Refer to
[digilib-map.xml.template](https://github.com/robcast/digilib/blob/master/webapp/src/main/webapp/WEB-INF/digilib-map.xml.template)
for an example. 

The file contains `mapping` elements with a `link` attribute containing a 'virtual directory' name that is redirected to the 
directory given in the `dir` attribute.


### Image processing options

```xml
<parameter name="default-quality" value="2" />
```

The default interpolation quality.

* `0`: do not use interpolation (worst), 
* `1`: use linear interpolation,
* `2`: use bilinear interpolation and blur-before-scale (best).

```xml
<parameter name="max-image-size" value="0" />
```

The maximum size of delivered images as pixel area, `40000` means up to 200x200 or 100x400, `0` means no limit.

```xml
<parameter name="sendfile-allowed" value="true" />
```

Defines whether requests with `mo=file` or `mo=rawfile` as parameter are allowed to download files (see
[Scaler API](scaler-api.html)).

```xml
<parameter name="subsample-minimum" value="2.0" />
```

Degree of subsampling on image load. This is the minimum factor that is scaled by interpolation and not by 
subsampling, i.e. by skipping pixels.


### Authentication and authorization

Details are provided in the
[documentation on authentication and authorization](auth.html).

```xml
<parameter name="use-authorization" value="false" />
```

Enables or disables all authorization. If `use-authorization` is `true` you also have to configure
`authnops-class`, `authzops-class` and the `auth-file` and its contents.

```xml
<parameter name="auth-file" value="digilib-auth.xml" />
```

Configuration file for authentication and authorization. The format and content of the configuration file
is determined by the chosen authentication and authorization classes. 

```xml
<parameter name="authn-token-cookie" value="id_token" />
```

The name of the cookie that holds the authentication token for `digilib.auth.OpenIdAuthnOps`.

```xml
<parameter name="authnops-class" value="digilib.auth.IpAuthnOps" />
```

The class to handle authentication.

```xml
<parameter name="authzops-class" value="digilib.auth.PathAuthzOps" />
```

The class to handle authorization.


### IIIF API options

The options configure the IIIF interface. For more information see the [digilib IIIF documentation](iiif-api)

```xml
<parameter name="iiif-api-version" value="2.1" />
```

The IIIF API version for the generated `info.json` information response.  

```xml
<parameter name="iiif-info-cors" value="true" />
```

Enables the `Cross-Origin Resource Sharing` header in IIIF info requests.

```xml
<parameter name="iiif-image-cors" value="true" />
```

Enables the `Cross-Origin Resource Sharing` header in IIIF image requests.

```xml
<parameter name="iiif-prefix" value="IIIF" />
```

The prefix (after `Scaler`) that leads to the IIIF API.

```xml
<parameter name="iiif-slash-replacement" value="!" />
```

The character that replaces a slash in the identifier of IIIF requests.


### Threading options

```xml
<parameter name="max-waiting-threads" value="20" />
```

The maximum number of requests waiting in the queue before new requests get "service unavailable".

```xml
<parameter name="worker-threads" value="2" />
```

The maximum number of concurrently working threads.

```xml
<parameter name="worker-timeout" value="60000" />
```

Timeout for worker threads in milliseconds.


### Other options

```xml
<parameter name="default-errmsg-type" value="image" />
```

Defines how errors are presented to the user. Allowed values are `code`, `image` and
`text`.

* `image` sends an error-image as error code (see `denied-image`, `error-image`, `notfound-image` parameters).
* `code` sends an HTTP error code, which may result in a broken image display in the browser.
* `text` sends a plain-text error message, which may result in a broken image display in the browser.

```xml
<parameter name="img-diskcache-allowed" value="false" />
```

Enables the use of a disk cache for the image toolkit. Using the disk cache may leak file handles
and lead to resource issues if digilib runs for a long time.

```xml
<parameter name="log-config-file" value="log4j-config.xml" />
```

Location of the logging configuration file. The current logging library is 
[Log4J 1.2](https://logging.apache.org/log4j/1.2/manual.html).

### Options for developers

Using these options you can replace default classes used by digilib with your own implementations
to change the behaviour of digilib. 

```xml
<parameter name="docuimage-class" value="digilib.image.ImageLoaderDocuImage" />
```


Class of the `DocuImage` instance. You can replace the `digilib.image.DocuImage` implementation to use a different image
toolkit than Java ImageIO. (There are deprecated alternative implementations in the `common-jai`,
`common-imagej` and `common-bioformats` modules.) 

```xml
<parameter name="docuimage-hacks" value="" />
```

Text string to selectively enable specific `Hacks` in the `DocuImage` implementation
(see [the source](https://github.com/robcast/digilib/blob/master/common/src/main/java/digilib/image/ImageLoaderDocuImage.java))

```xml
<parameter name="filemeta-class" value="digilib.meta.IndexMetaFileMeta" />
<parameter name="dirmeta-class" value="digilib.meta.IndexMetaDirMeta" />
```

Classes of the `digilib.meta.FileMeta` and `digilib.meta.DirMeta` implementations. You can change these implementations
to change the way digilib finds metadata about image files.

`IndexMetaFileMeta` and `IndexMetaDirMeta` read metadata from `index.meta` and `*.meta` XML files according to
the [index meta standard](http://intern.mpiwg-berlin.mpg.de/digitalhumanities/mpiwg-metadata-documentation/formate/indexmeta-standard).

```xml
<parameter name="docudirectory-class" value="digilib.io.BaseDirDocuDirectory" />
```

Class of the `digilib.io.DocuDirectory` implementation. You can change this implementation to change the way
digilib finds image files (including different resolutions).

