# digilib

![digilib-logo](https://robcast.github.io/digilib/images/digilib-logo-big.png)

A Docker container for the [digilib image server](https://robcast.github.io/digilib/).

digilib is a [IIIF API](https://iiif.io) compliant image server written in Java:
  * Documentation: https://robcast.github.io/digilib/
  * Issues: https://github.com/robcast/digilib/issues
  * Source code: https://github.com/robcast/digilib

## Supported tags

  * **release-x.y.z**: Tagged release builds.
  * **snapshot**: unstable daily builds from the `master` branch.

## Dependencies

The digilib runtime image builds on the [tomcat:9-jre11](https://hub.docker.com/_/tomcat) image.

## How to use this image

Quick try-out using built-in images:
```
docker run --rm -p 8080:8080 robcast/digilib
```
Then open https://localhost:8080/digilib/digilib.html in your browser.

To use your own images in the directory `/your/image/path` on your host system:
```
docker run --rm \
	-p 8080:8080 \
    --name digilib \
    -e BASEDIR_LIST="/var/lib/images" \
    -v /your/image/path:/var/lib/images \
    robcast/digilib
```

## Available parameters for the container

You can set the values of the most important digilib configuration parameters as environment variables 
using the `-e` option of `docker run`. For more information check the 
[digilib-config documentation](https://robcast.github.io/digilib/digilib-config.html).

  * BASEDIR_LIST: The list of directories where images are searched.

  * DEFAULT_QUALITY: The default interpolation quality (0: do not use interpolation (worst),
  1: use linear interpolation,
  2: use bilinear interpolation and blur-before-scale (best, default))

  * MAX_IMAGE_SIZE: The maximum size of delivered images as pixel area, 40000 means up to 200x200 or 100x400, 
0 (default) means no limit.
    
  * SENDFILE_ALLOWED: Is sending whole image files with mo=file allowed (default: "true")?

  * WORKER_THREADS: Number of parallel working threads (default: 2).

  * MAX_WAITING_THREADS: Maximum number of waiting requests in queue (default: 20).

  * IIIF_PREFIX: The URL prefix (after Scaler) that leads to the IIIF API (default: "IIIF")

## Using your own `digilib-config.xml`

If you need more control over your [digilib configuration](https://robcast.github.io/digilib/digilib-config.html)
then you can supply your own `digilib-config.xml` file by mounting it
to `/usr/local/tomcat/webapps/digilib/WEB-INF/digilib-config.xml` in the container:
```
docker run --rm \
	-p 8080:8080 \
    --name digilib \
    -v digilib-config.xml:/usr/local/tomcat/webapps/digilib/WEB-INF/digilib-config.xml
    -v /your/image/path:/var/lib/images \
    robcast/digilib
```

Note: when you use your own config file you can not use the predefined parameters described above.

## Building your own container image

You can build your own digilib container image from the digilib sources:
```
git clone https://github.com/robcast/digilib.git
cd digilib
docker build -f build/docker/Dockerfile -t mydigilib:latest .
```

You can supply additional options to Maven during the build process using the `MVM_ARGS` build parameter:
```
docker build -f build/docker/Dockerfile -t mydigilib:latest --build-arg MVN_ARGS="-Piiif-presentation" .
```
See the [digilib build documentation](https://robcast.github.io/digilib/build-maven.html) for more information.
