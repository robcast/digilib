# The robcast/digilib docker image

[robcast/digilib](https://hub.docker.com/r/robcast/digilib) is a public Docker image 
on the central Docker Hub server that you can use to run digilib without installing
Java or Tomcat yourself - all you need is to install [Docker](https://www.docker.com/).

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

## Supported tags

  * **release-x.y.z**: Tagged release builds.
  * **snapshot**: unstable daily builds from the `master` branch.

## Dependencies

The digilib runtime image builds on the [tomcat:9-jre11](https://hub.docker.com/_/tomcat) image.

## Available parameters for the container

You can set the values of the most important digilib configuration parameters as environment variables 
using the `-e` option of `docker run`. For more information check the 
[digilib-config documentation](https://robcast.github.io/digilib/digilib-config.html).

  * BASEDIR_LIST: list of directories where images are searched (required)

  * DEFAULT_QUALITY: default interpolation quality (0: do not use interpolation (worst),
  1: use linear interpolation,
  2: use bilinear interpolation and blur-before-scale (best, default))

  * MAX_IMAGE_SIZE: maximum size of delivered images as number of pixels, 40000 means up to 200x200 or 100x400, 
0 (default) means no limit
    
  * SENDFILE_ALLOWED: is sending whole image files with mo=file allowed (default: "true")?

  * WORKER_THREADS: number of parallel working threads (default: 2)

  * MAX_WAITING_THREADS: maximum number of waiting requests in queue (default: 20)

  * IIIF_PREFIX: URL prefix (after Scaler) for the IIIF API (default: "IIIF")
  
  * IIIF_IMAGE_BASE_URL: base URL for the IIIF image API
  
  * IIIF_MANIFEST_BASE_URL: base URL for the IIIF presentation API

## Using your own digilib config file

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
