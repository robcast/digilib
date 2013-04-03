package digilib.meta;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URI;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.Map;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;

import org.apache.log4j.Logger;

/*
 * #%L
 * IndexMetaAuthLoader -- Load XML format metadata into MetadataMaps
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2013 MPIWG Berlin
 * %%
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as 
 * published by the Free Software Foundation, either version 3 of the 
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Lesser Public License for more details.
 * 
 * You should have received a copy of the GNU General Lesser Public 
 * License along with this program.  If not, see
 * <http://www.gnu.org/licenses/lgpl-3.0.html>.
 * #L%
 * Author: Robert Casties (robcast@berlios.de)
 */

/**
 * Class loading index.meta files with metadata extracting some image file
 * related information.
 * Extracts into the MetadataMap all tags in the meta/img tag as key-value
 * pairs.
 * Returns a map with filenames and MetadataMaps.
 * 
 * @see <a
 *      href="http://intern.mpiwg-berlin.mpg.de/digitalhumanities/mpiwg-metadata-documentation/formate/indexmeta-standard">index.meta
 *      spec</a>
 * @author Robert Casties
 * 
 */
public class IndexMetaAuthLoader {

    private Logger logger = Logger.getLogger(this.getClass());

    protected String metaTag = "meta";
    protected String fileTag = "file";
    protected String fileNameTag = "name";
    protected String filePathTag = "path";
    protected String imgTag = "img";
    protected String accessTag = "access";
    protected String accessConditionsTag = "access-conditions";

    private XMLStreamReader reader;
    private LinkedList<String> tags;
    private String filename;
    private String filepath;

    protected boolean matchesPath(LinkedList<String> tags, String[] path) {
        try {
            for (int i = path.length - 1; i >= 0; --i) {
                if (!path[i].equals(tags.get(i))) {
                    return false;
                }
            }
            return true;
        } catch (IndexOutOfBoundsException e) {
            // nothing to do
        }
        return false;
    }

    protected boolean readToMetaTag() throws XMLStreamException {
        String thisTag = null;
        String lastTag = null;
        StringBuffer text = new StringBuffer();
        for (int event = reader.next(); event != XMLStreamConstants.END_DOCUMENT; event = reader.next()) {
            if (event == XMLStreamConstants.START_ELEMENT) {
                // save last tag
                lastTag = thisTag;
                // init text content
                text = new StringBuffer();
                // get tag TODO: make namespace aware
                thisTag = reader.getLocalName();
                // save on stack
                tags.push(thisTag);
                if (thisTag.equals(metaTag)) {
                    return true;
                } else if (thisTag.equals(fileTag)) {
                    // reset filenames
                    filename = null;
                    filepath = null;
                }
            } else if (event == XMLStreamConstants.CHARACTERS) {
                text.append(reader.getText());
            } else if (event == XMLStreamConstants.END_ELEMENT) {
                // get tag TODO: make namespace aware
                thisTag = reader.getLocalName();
                tags.pop();
                if (thisTag.equals(fileNameTag) && lastTag != null && lastTag.equals(fileTag)) {
                    // name inside file tag -> record name
                    filename = text.toString();
                } else if (thisTag.equals(filePathTag) && lastTag != null && lastTag.equals(fileTag)) {
                    // path inside file tag -> record path
                    filepath = text.toString();
                }
            }
        }
        return false;
    }

    protected MetadataMap readTagToMap(MetadataMap map) throws XMLStreamException {
        String thisTag = null;
        String outerTag = tags.peek();
        StringBuffer text = new StringBuffer();
        for (int event = reader.next(); event != XMLStreamConstants.END_DOCUMENT; event = reader.next()) {
            if (event == XMLStreamConstants.START_ELEMENT) {
                // init text content
                text = new StringBuffer();
                // get tag TODO: make namespace aware
                thisTag = reader.getLocalName();
                // save on stack
                tags.push(thisTag);
            } else if (event == XMLStreamConstants.CHARACTERS) {
                text.append(reader.getText());
            } else if (event == XMLStreamConstants.END_ELEMENT) {
                // get tag TODO: make namespace aware
                thisTag = reader.getLocalName();
                tags.pop();
                if (thisTag.equals(outerTag)) {
                    // close outer tag
                    return map;
                }
                // put text in map under tag name
                map.put(thisTag, text.toString());
            }
        }
        return map;
    }

    protected MetadataMap readAccessConditionsToMap(MetadataMap map) throws XMLStreamException {
        String thisTag = null;
        String outerTag = tags.peek();
        StringBuffer text = new StringBuffer();
        String accType = null;
        String accName = null;
        for (int event = reader.next(); event != XMLStreamConstants.END_DOCUMENT; event = reader.next()) {
            if (event == XMLStreamConstants.START_ELEMENT) {
                // init text content
                text = new StringBuffer();
                // get tag TODO: make namespace aware
                thisTag = reader.getLocalName();
                // save on stack
                tags.push(thisTag);
                // save type attribute of access tag
                if (thisTag.equals(accessTag)) {
                    accType = reader.getAttributeValue(null, "type");
                }
            } else if (event == XMLStreamConstants.CHARACTERS) {
                text.append(reader.getText());
            } else if (event == XMLStreamConstants.END_ELEMENT) {
                // get tag TODO: make namespace aware
                thisTag = reader.getLocalName();
                tags.pop();
                if (thisTag.equals(outerTag)) {
                    // close outer tag
                    return map;
                } else if (thisTag.equals("name") && tags.size() > 0 && tags.peek().equals(accessTag)) {
                    // access/name
                    accName = text.toString();
                } else if (thisTag.equals(accessTag)) {
                    // end of access tag
                    if (accType == null) {
                        // no access type
                        return map;
                    }
                    String access = null;
                    if (accType.equals("free")) {
                        access = accType;
                    } else if (accName != null) {
                        access = accType + ":" + accName;
                    } else {
                        // type != free but no name
                        logger.error("access type="+accType+" but no name!");
                        return map;
                    }
                    map.put("access", access);
                }
            }
        }
        return map;
    }

    protected MetadataMap readMetaTag(MetadataMap map) throws XMLStreamException {
        String thisTag = null;
        for (int event = reader.next(); event != XMLStreamConstants.END_DOCUMENT; event = reader.next()) {
            if (event == XMLStreamConstants.START_ELEMENT) {
                // get tag TODO: make namespace aware
                thisTag = reader.getLocalName();
                // save on stack
                tags.push(thisTag);
                if (thisTag.equals(imgTag)) {
                    map = readTagToMap(map);
                }
                if (thisTag.equals(accessConditionsTag)) {
                    map = readAccessConditionsToMap(map);
                }
            } else if (event == XMLStreamConstants.END_ELEMENT) {
                // get tag TODO: make namespace aware
                thisTag = reader.getLocalName();
                tags.pop();
                if (thisTag.equals(metaTag)) {
                    // close meta tag
                    return map;
                }
            }
        }
        return map;
    }

    /**
     * Load and parse a file (as URI).
     * returns HashMap with list data
     * 
     * @throws IOException
     */
    public Map<String, MetadataMap> loadUri(URI uri) throws IOException {
        Map<String, MetadataMap> files = new HashMap<String, MetadataMap>();
        try {
            InputStream in = uri.toURL().openStream();
            XMLInputFactory factory = XMLInputFactory.newInstance();
            reader = factory.createXMLStreamReader(in);
            // start reading
            tags = new LinkedList<String>();
            while (readToMetaTag()) {
                String fn = "";
                if (filename != null) {
                    if (filepath != null) {
                        fn = filepath + "/" + filename;
                    } else {
                        fn = filename;
                    }
                }
                MetadataMap meta = new MetadataMap();
                meta = readMetaTag(meta);
                // save meta in file list
                files.put(fn, meta);
            }
        } catch (MalformedURLException e) {
            logger.error("Malformed URL!");
            throw new IOException(e);
        } catch (XMLStreamException e) {
            logger.error("XMLStream Error!");
            throw new IOException(e);
        }
        return files;
    }
}
