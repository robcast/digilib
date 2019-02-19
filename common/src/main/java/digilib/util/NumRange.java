package digilib.util;

/*
 * #%L
 * Class handling numerical ranges.
 * %%
 * Copyright (C) 2010 - 2013 MPIWG Berlin
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

import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;

/**
 * Class that parses String with intervals into Iterable sequence of integers.
 * 
 * Intervals are separated by comma ','.
 * An interval is a range represented by two numbers and a hyphen
 * e.g. "3-6". If the second number is omitted the interval goes to maxnum.
 * An interval can also consist of a single number e.g. "7".
 * 
 * Valid NumRanges: "1-10,13-20", "3,5,9", "1-".
 * 
 * @author casties
 * 
 */
public class NumRange implements Iterable<Integer> {

    private Integer start = 1;
    private Integer end = Integer.MAX_VALUE;
    private List<Integer> list = null;
    private Integer maxnum = null;

    /**
     * @param start
     * @param end
     */
    public NumRange(Integer start, Integer end) {
        this.start = start;
        this.end = end;
    }

    /**
     * @param range
     */
    public NumRange(String range) {
        parseString(range);
    }

    /**
     * @param range
     */
    public NumRange(String range, Integer max) {
        this.maxnum = max;
        parseString(range);
    }


    public void parseString(String pages) {

        ArrayList<Integer> pgs = new ArrayList<Integer>();

        String intervals[] = pages.split(",");

        // convert the page-interval-strings into a list containing every single page
        for (String interval : intervals) {
            if (interval.contains("-")) {
                String nums[] = interval.split("-");
                int start = Integer.valueOf(nums[0]);
                if (nums.length > 1) {
                    // second number is end of range
                    int end = Integer.valueOf(nums[1]);
                    if (intervals.length == 1) {
                        // optimized case of just one interval
                        this.start = start;
                        this.end = end;
                        this.list = null;
                        return;
                    }
                    for (int i = start; i <= end; i++) {
                        // add all numbers to list
                        pgs.add(i);
                    }
                } else {
                    // second number missing: range to infinity
                    pgs.add(start);
                    pgs.add(Integer.MAX_VALUE);
                }
            } else {
                // single number
                pgs.add(Integer.valueOf(interval));
            }
        }
        if (intervals.length > 1) {
            Collections.sort(pgs);
        }
        list = pgs;
    }

    public int getStart() {
        if (list == null) {
            return start;
        } else {
            return list.get(0);
        }
    }

    public int getEnd() {
        Integer last;
        if (list == null) {
            last = end;
        } else {
            last = list.get(list.size() - 1);
        }
        if (maxnum == null) {
            return last;
        } else {
            return Math.min(last, maxnum);
        }
    }

    public Iterator<Integer> iterator() {
        if (list == null) {
            // return count-based iterator
            return new Iterator<Integer>() {
                // anonymous inner Iterator class
                private int num = getStart();
                private int end = getEnd();

                public boolean hasNext() {
                    return (num <= end);
                }

                public Integer next() {
                    return num++;
                }

                public void remove() {
                    // don't do this
                }
            };
        } else {
            // return list-based iterator
            return new Iterator<Integer>() {
                // anonymous inner Iterator class
                private int listidx = 0;
                private int listend = list.size();
                private int num = getStart();
                private int end = getEnd();

                public boolean hasNext() {
                    return (num <= end);
                }

                public Integer next() {
                    if (listidx < listend - 1) {
                        num = list.get(listidx++);
                        return num;
                    } else if (listidx == listend - 1) {
                        // last element in list
                        int n = list.get(listidx++);
                        if (n == Integer.MAX_VALUE) {
                            // open end -- continue
                            num++;
                            return num++;
                        } else {
                            num = n;
                            return num++;
                        }
                    } else {
                        return num++;
                    }
                }

                public void remove() {
                    // don't do this
                }
            };
        }
    }

    public void setMaxnum(Integer maxnum) {
        this.maxnum = maxnum;
    }

}
