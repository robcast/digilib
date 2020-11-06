package digilib.meta;

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
 * Author: Robert Casties (robcast@users.sourceforge.net)
 */

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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Class loading index.meta files extracting image file related information.
 * 
 * Extracts into the MetadataMap all tags in the meta/img tag as key-value
 * pairs and information from the meta/access tag under the "access" key.
 * 
 * <pre>
 * {@code
 *   <meta>
 *     <img>
 *       <original-dpi>600</original-dpi>
 *     </img>
 *     <access-conditions>
 *       <access type="group">
 *         <name>digigroup</name>
 *       </access>
 *     </access-conditions>
 *   </meta>
 * }
 * </pre>
 * 
 * Returns a map with filenames and MetadataMaps with directory-wide information 
 * under the key "":
 * <pre>
 *   {
 *   "pageimg/page140r.jpg" : {"original-dpi" : 300}
 *   "" : { "access" : "group:digigroup", "original-dpi" : 600}, 
 *   }
 * </pre>
 * 
 * Implemented using javax.xml.stream.XMLStreamReader.
 * 
 * @see <a
 *      href="http://intern.mpiwg-berlin.mpg.de/digitalhumanities/mpiwg-metadata-documentation/formate/indexmeta-standard">index.meta
 *      spec</a>
 * @author Robert Casties
 * 
 */
public class IndexMetaAuthLoader {

    protected static final Logger logger = LoggerFactory.getLogger(IndexMetaAuthLoader.class);

    protected String metaTag = "meta";
    protected String fileTag = "file";
    protected String[] fileNamePath = {"file", "name"};
    protected String[] filePathPath = {"file", "path"};
    protected String[] fileMetaPath = {"file", "meta"};
    protected String imgTag = "img";
    protected String accessTag = "access";
    protected String[] accessPath = {"access-conditions", "access"};
    protected String[] accessNamePath = {"access", "name"};

    private XMLStreamReader reader;
    private LinkedList<String> tags;

    protected Map<String, MetadataMap> files;

    /**
     * Returns if the tag names in path match the current stack of tag names in tags.
     * @param path the path
     *   
     * @return tags match path
     */
    protected boolean tagsMatchPath(String[] path) {
        try {
            int pl = path.length;
            for (int i = pl - 1; i >= 0; --i) {
                if (!path[i].equals(tags.get(pl-i-1))) {
                    return false;
                }
            }
            return true;
        } catch (IndexOutOfBoundsException e) {
            // nothing to do
        }
        return false;
    }

    /**
     * Read the whole stream.
     * 
     * @return false
     * @throws XMLStreamException on error
     */
    protected boolean readAll() throws XMLStreamException {
        StringBuffer text = new StringBuffer();
        MetadataMap fileMeta = new MetadataMap();
        MetadataMap otherMeta = new MetadataMap();
        String filename = null;
        String filepath = null;
        for (int event = reader.next(); event != XMLStreamConstants.END_DOCUMENT; event = reader.next()) {
            if (event == XMLStreamConstants.START_ELEMENT) {
                // get tag TODO: make namespace aware
                String thisTag = reader.getLocalName();
                // save on stack
                tags.push(thisTag);
                // new text content
                text = new StringBuffer();
                // look at tag
                if (thisTag.equals(metaTag)) {
                    /*
                     * meta tag - read contents in new meta map
                     */
                    if (tagsMatchPath(fileMetaPath)) {
                        fileMeta = readMetaTag(new MetadataMap());
                    } else {
                        otherMeta = readMetaTag(new MetadataMap());
                    }
                } else if (thisTag.equals(fileTag)) {
                    /*
                     * file tag - reset filenames
                     */
                    filename  = null;
                    filepath  = null;
                }
            } else if (event == XMLStreamConstants.CHARACTERS) {
                // append text nodes
                text.append(reader.getText());
            } else if (event == XMLStreamConstants.END_ELEMENT) {
                // get tag TODO: make namespace aware
                String thisTag = reader.getLocalName();
                if (thisTag.equals(fileTag)) {
                    /*
                     * file tag - save file meta
                     */
                    if (!fileMeta.isEmpty()) {
                        String fn = "";
                        if (filename != null) {
                            if (filepath != null) {
                                fn = filepath + "/" + filename;
                            } else {
                                fn = filename;
                            }
                        }
                        // save meta in file list
                        files.put(fn, fileMeta);
                    }                    
                } else if (tagsMatchPath(fileNamePath)) {
                    /*
                     * file/name tag - record name
                     */
                    filename = text.toString();
                } else if (tagsMatchPath(filePathPath)) {
                    /*
                     * file/path tag - record path
                     */
                    filepath = text.toString();
                }
                tags.pop();
            }
        }
        if (!otherMeta.isEmpty()) {
            // non-file meta put under key ""
            files.put("", otherMeta);
        }
        return false;
    }

    /**
     * Reads contents of current tag into map with the tag name as key and the content as value.
     *   
     * @param map the MetadataMap
     * @return the MetadataMap
     * @throws XMLStreamException on error
     */
    protected MetadataMap readTagToMap(MetadataMap map) throws XMLStreamException {
        String outerTag = tags.peek();
        StringBuffer text = new StringBuffer();
        for (int event = reader.next(); event != XMLStreamConstants.END_DOCUMENT; event = reader.next()) {
            if (event == XMLStreamConstants.START_ELEMENT) {
                // get tag TODO: make namespace aware
                String thisTag = reader.getLocalName();
                // save on stack
                tags.push(thisTag);
                // new text content
                text = new StringBuffer();
            } else if (event == XMLStreamConstants.CHARACTERS) {
                text.append(reader.getText());
            } else if (event == XMLStreamConstants.END_ELEMENT) {
                // get tag TODO: make namespace aware
                String thisTag = reader.getLocalName();
                if (thisTag.equals(outerTag)) {
                    // close outer tag
                    tags.pop();
                    return map;
                }
                // put text in map under tag name
                map.put(thisTag, text.toString());
                tags.pop();
            }
        }
        return map;
    }

    /**
     * Reads access tag into map.
     * 
     * @param map the MetadataMap
     * @return the MetadataMap
     * @throws XMLStreamException on error
     */
    protected MetadataMap readAccessToMap(MetadataMap map) throws XMLStreamException {
        StringBuffer text = new StringBuffer();
        String accType = null;
        String accName = null;
        if (tagsMatchPath(accessPath)) {
            // read attribute from current access tag
            accType = reader.getAttributeValue(null, "type");
        }
        for (int event = reader.next(); event != XMLStreamConstants.END_DOCUMENT; event = reader.next()) {
            if (event == XMLStreamConstants.START_ELEMENT) {
                // get tag TODO: make namespace aware
                String thisTag = reader.getLocalName();
                // save on stack
                tags.push(thisTag);
                // new text content
                text = new StringBuffer();
                // save type attribute of access tag
                if (thisTag.equals(accessTag)) {
                    accType = reader.getAttributeValue(null, "type");
                }
            } else if (event == XMLStreamConstants.CHARACTERS) {
                text.append(reader.getText());
            } else if (event == XMLStreamConstants.END_ELEMENT) {
                if (tagsMatchPath(accessNamePath)) {
                    /*
                     * access/name tag
                     */
                    accName = text.toString();
                } else if (tagsMatchPath(accessPath)) {
                    /*
                     * access tag - we're done
                     */
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
                        logger.error("access type={} but no name!", accType);
                        tags.pop();
                        return map;
                    }
                    map.put("access", access);
                    tags.pop();
                    return map;
                }
                tags.pop();
            }
        }
        return map;
    }

    /**
     * Read meta tag into map.
     * 
     * @param map the MetadataMap
     * @return the MetadataMap
     * @throws XMLStreamException on error
     */
    protected MetadataMap readMetaTag(MetadataMap map) throws XMLStreamException {
        String thisTag = null;
        for (int event = reader.next(); event != XMLStreamConstants.END_DOCUMENT; event = reader.next()) {
            if (event == XMLStreamConstants.START_ELEMENT) {
                // get tag TODO: make namespace aware
                thisTag = reader.getLocalName();
                // save on stack
                tags.push(thisTag);
                if (thisTag.equals(imgTag)) {
                    /*
                     * img tag
                     */
                    map = readTagToMap(map);
                } else if (tagsMatchPath(accessPath)) {
                    /*
                     * access tag
                     */
                    map = readAccessToMap(map);
                }
            } else if (event == XMLStreamConstants.END_ELEMENT) {
                // get tag TODO: make namespace aware
                thisTag = reader.getLocalName();
                if (thisTag.equals(metaTag)) {
                    // close meta tag
                    tags.pop();
                    return map;
                }
                tags.pop();
            }
        }
        return map;
    }

    /**
     * Load and parse a file (as URI).
     * returns HashMap with list data
     * 
     * @param uri the URI
     * @return the metadata
     * @throws IOException on error
     */
    public Map<String, MetadataMap> loadUri(URI uri) throws IOException {
        files = new HashMap<String, MetadataMap>();
        try {
            InputStream in = uri.toURL().openStream();
            XMLInputFactory factory = XMLInputFactory.newInstance();
            reader = factory.createXMLStreamReader(in);
            // start reading
            tags = new LinkedList<String>();
            readAll();
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
