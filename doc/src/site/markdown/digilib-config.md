# Configuring digilib

The main configuration for *digilib* is the XML file `digilib-config.xml` in the
`WEB-INF` directory of the webapp or a Java properties file `digilib.properties`
somewhere in the classpath.
(If you really need a different location for the XML file you can define it in
the `config-file` init-parameter to the Servlet. **TODO** add an example)

In the configuration file you can set lots of paths and options. *digilib* uses
default values for all configuration settings that meet most requirements.
Hence you have to configure only the settings that you want to change. The
**`basedir-list`** parameter however is **mandatory** unless you want to serve
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
`<base_url>/server/dlConfig.jsp`.

### Image locations

```xml
<parameter name="basedir-list" value="sample-images" />
```

A list of directories where images are searched. See
[this document](image-directories.html) for details.

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

This image to sent to indicate an undiscoverable image.

```xml
<parameter name="use-mapping" value="false" />
```

Enables the mapping of 'virtual directories' to actual directories in the
filesystem.

```xml
<parameter name="mapping-file" value="digilib-map.xml" />
```

The location of the mapping file. Refer to
[this template](https://sourceforge.net/p/digilib/code/ci/default/tree/webapp/src/main/webapp/WEB-INF/digilib-map.xml.template)
for an example. **TODO** elaborate `link` and `dir` attribute or the whole file structure.


### Image processing options

```xml
<parameter name="default-quality" value="2" />
```

The default interpolation quality (`0` is worst).

**TODO** document valid value range

```xml
<parameter name="max-image-size" value="0" />
```

The maximum size of delivered images, `0` means no limit.

**TODO** mention measurement unit explicitly

```xml
<parameter name="sendfile-allowed" value="true" />
```

Defines whether requests with `mo=file` as parameter are allowed (see
[Scaler API](scaler-api.html)).

```xml
<parameter name="subsample-minimum" value="2.0" />
```

Degree of subsampling on image load. **TODO** valid / recommended value range


### Authentication and authorization

Details are provided in the
[documentation on authentication and authorization](auth.html).

```xml
<parameter name="auth-file" value="digilib-auth.xml" />
```

Configuration file for authentication and authorization.

```xml
<parameter name="auth-url-path" value="authenticated/" />
```

This part of the URL indicates authorized access. **TODO** clarify by example?

```xml
<parameter name="authn-token-cookie" value="id_token" />
```

The name of the cookie that holds the authentication token.

```xml
<parameter name="authnops-class" value="digilib.auth.IpAuthnOps" />
```

The class to handle authentication.

```xml
<parameter name="authzops-class" value="digilib.auth.PathAuthzOps" />
```

The class to handle authorization.

```xml
<parameter name="use-authorization" value="false" />
```

Enables authorization.


### IIIF API options

The options configure the [IIIF](iiif-api) interface.

```xml
<parameter name="iiif-api-version" value="2.1" />
```

The supported IIIF API version. **FIXME**? shouldn't that be set programmatically?

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

The character that replaces a slash in IIIF requests.


### Threading options

```xml
<parameter name="max-waiting-threads" value="20" />
```

The number of waiting requests in the queue.

```xml
<parameter name="worker-threads" value="2" />
```

The number of working threads.

```xml
<parameter name="worker-timeout" value="60000" />
```

Timeout for worker threads in milliseconds.


### Assorted options

```xml
<parameter name="default-errmsg-type" value="image" />
```

Defines how errors are represented. Allowed values are `code`, `image` and
`text`.

```xml
<parameter name="img-diskcache-allowed" value="false" />
```

Enables the use of a disk cache for the image toolkit.
**TODO** elaborate dis-/advantages.

```xml
<parameter name="log-config-file" value="log4j-config.xml" />
```

Location of the logging configuration.

**TODO** amend a link to a useful, elaborative resource


### Unknown category

**TODO** move items to appropriate sections

```xml
<parameter name="dirmeta-class" value="digilib.meta.IndexMetaDirMeta" />
```

Class for **TODO**.

```xml
<parameter name="docudirectory-class" value="digilib.io.BaseDirDocuDirectory" />
```

Class for **TODO**.

```xml
<parameter name="docuimage-class" value="digilib.image.ImageLoaderDocuImage" />
```

Class for the `DocuImage` instance, **TODO** elaborate intended use

```xml
<parameter name="docuimage-hacks" value="" />
```

**TODO** elaborate

```xml
<parameter name="filemeta-class" value="digilib.meta.IndexMetaFileMeta" />
```
Class for **TODO**.
