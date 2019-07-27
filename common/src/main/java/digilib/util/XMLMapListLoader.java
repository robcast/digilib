package digilib.util;

/*
 * #%L
 * XMLMapListLoader -- Load XML into a List of Maps
 * 
 * Digital Image Library servlet components
 *
 * %%
 * Copyright (C) 2016 MPIWG Berlin
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
import java.net.URI;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

import javax.xml.parsers.ParserConfigurationException;
import javax.xml.parsers.SAXParser;
import javax.xml.parsers.SAXParserFactory;

import org.apache.log4j.Logger;
import org.xml.sax.Attributes;
import org.xml.sax.SAXException;
import org.xml.sax.SAXParseException;
import org.xml.sax.helpers.DefaultHandler;

/**
 * Loads a simple XML structure into a List of Maps.
 * 
 * The XML file has an outer <code>list_tag</code>. Every entry is an
 * <code>entry_tag</code>. All attributes are loaded into a Map. 
 * 
 * Nested tags are not supported. The text
 * content of the tag is put in the Map under the key "_text".
 * 
 * The file is read by the <code>loadURI()</code> method, that returns a List with
 * Maps of key-value pairs.
 * 
 * @author casties
 */
public class XMLMapListLoader {

    private Logger logger = Logger.getLogger(this.getClass());
    private String listTag = "list";
    private String entryTag = "entry";
    public static String CONTENT_KEY = "_text"; 

    public XMLMapListLoader() {
    }

    /**
     * Creates an XMLMapListLoader with an outer <code>list_tag</code>. Every
     * entry is an <code>entry_tag</code>. All attributes are stored in a Map.
     * 
     * @param list_tag the list tag
     * @param entry_tag the entry tag
     */
    public XMLMapListLoader(String list_tag, String entry_tag) {
        logger.debug("XMLMapListLoader(" + list_tag + "," + entry_tag + ")");
        listTag = list_tag;
        entryTag = entry_tag;
    }

    /**
     * Inner class MapListParser to be called by the SAX parser
     */
    private class MapListParser extends DefaultHandler {

        private List<Map<String, String>> listData;
        private Map<String, String> elementData;
        private LinkedList<String> tagSpace;

        public List<Map<String, String>> getData() {
            return listData;
        }

        // Parser calls this once at the beginning of a document
        @Override
        public void startDocument() throws SAXException {
            listData = new LinkedList<Map<String, String>>();
            tagSpace = new LinkedList<String>();
        }

        // Parser calls this for each element in a document
        @Override
        public void startElement(String namespaceURI, String localName, String qName, Attributes atts)
                throws SAXException {
            // open a new tag
            tagSpace.addLast(qName);

            // is it an entry tag?
            if (qName.equals(entryTag)) {
                // is it inside a list tag?
                if ((listTag.length() > 0) && (!tagSpace.contains(listTag))) {
                    logger.error("BOO: Entry " + entryTag + " not inside list " + listTag);
                    throw new SAXParseException("Entry " + entryTag + " not inside list " + listTag, null);
                }
                // get the attributes
                elementData = new HashMap<String, String>();
                int numAtts = atts.getLength();
                for (int i = 0; i < numAtts; ++i) {
                    // use localname as key
                    String key = atts.getLocalName(i);
                    if (key.isEmpty()) {
                        key = atts.getQName(i);
                    }
                    String val = atts.getValue(i);
                    elementData.put(key, val);
                }
                // add the values
                listData.add(elementData);
            }
        }

        // Parser calls this for each chunk of text inside an element
        @Override
        public void characters(char[] ch, int start, int length) throws SAXException {
            if (elementData != null) {
                // add to current elementData
                String text = elementData.get(CONTENT_KEY);
                if (text == null) {
                    text = "";
                }
                text += new String(ch, start, length);
                elementData.put(CONTENT_KEY, text);
            }
        }

        // Parser calls this for each element in a document
        @Override
        public void endElement(String namespaceURI, String localName, String qName) throws SAXException {
            // exit the tag
            tagSpace.removeLast();
            elementData = null;
        }

    }

    /**
     * Load and parse a file (as URL).
     * 
     * returns List of Maps with data.
     * @param uri the URI
     * @return the Map
     * @throws SAXException on error
     * @throws IOException on error
     */
    public List<Map<String,String>> loadUri(URI uri) throws SAXException, IOException {
        // System.out.println("loadurl ("+path+")");
        // Create a JAXP SAXParserFactory and configure it
        SAXParserFactory spf = SAXParserFactory.newInstance();
        spf.setNamespaceAware(true);

        SAXParser parser = null;
        try {
            // Create a JAXP SAXParser
            parser = spf.newSAXParser();

        } catch (ParserConfigurationException e) {
            throw new SAXException(e);
        }

        // create a parser (keeps the data!)
        MapListParser listParser = new MapListParser();

        // Tell the SAXParser to parse the XML document
        parser.parse(uri.toString(), listParser);

        return listParser.getData();
    }

}
