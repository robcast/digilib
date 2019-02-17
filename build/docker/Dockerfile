# build stage
FROM maven:3-jdk-11 AS buildstage
WORKDIR /usr/src/digilib
COPY . /usr/src/digilib/
RUN mvn package
# remove the war file so we don't copy it in the next stage
RUN rm /usr/src/digilib/webapp/target/digilib-webapp-*.war

# runnable container stage
FROM tomcat:9-jre11 AS runstage
# remove tomcat default webapps
RUN rm -r /usr/local/tomcat/webapps/*
# copy digilib from build image
COPY --from=buildstage /usr/src/digilib/webapp/target/digilib-webapp-* /usr/local/tomcat/webapps/digilib/
