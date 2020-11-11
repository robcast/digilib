package digilib.util;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.junit.Assert;
import org.junit.Test;

public class NumRangeTest {
    @Test
    public void testInterval() {
        NumRange range = new NumRange(1, 5);
        List<Integer> result = new ArrayList<Integer>(5);
        for (Integer n : range) {
            result.add(n);
        }
        Assert.assertEquals(Arrays.asList(1, 2, 3, 4, 5), result);
    }

    @Test
    public void testInterval1() {
        NumRange range = new NumRange(1, 1);
        List<Integer> result = new ArrayList<Integer>(5);
        for (Integer n : range) {
            result.add(n);
        }
        Assert.assertEquals(Arrays.asList(1), result);
    }

    @Test
    public void testIntervalParse() {
        NumRange range = new NumRange("1-5");
        List<Integer> result = new ArrayList<Integer>(5);
        for (Integer n : range) {
            result.add(n);
        }
        Assert.assertEquals(Arrays.asList(1, 2, 3, 4, 5), result);
    }

    @Test
    public void testIntervalParse2() {
        NumRange range = new NumRange("1-2");
        List<Integer> result = new ArrayList<Integer>(5);
        for (Integer n : range) {
            result.add(n);
        }
        Assert.assertEquals(Arrays.asList(1, 2), result);
    }

    @Test
    public void testTwoIntervals() {
        NumRange range = new NumRange("1-3,7-9");
        List<Integer> result = new ArrayList<Integer>(6);
        for (Integer n : range) {
            result.add(n);
        }
        Assert.assertEquals(Arrays.asList(1, 2, 3, 7, 8, 9), result);
    }

    @Test
    public void testSingles() {
        NumRange range = new NumRange("1,3,5,7,9");
        List<Integer> result = new ArrayList<Integer>(5);
        for (Integer n : range) {
            result.add(n);
        }
        Assert.assertEquals(Arrays.asList(1, 3, 5, 7, 9), result);
    }

    @Test
    public void testUnbounded() {
        NumRange range = new NumRange("1-");
        List<Integer> result = new ArrayList<Integer>(5);
        for (Integer n : range) {
            result.add(n);
            if (n >= 5) break;
        }
        Assert.assertEquals(Arrays.asList(1, 2, 3, 4, 5), result);
    }

    @Test
    public void testUnboundedMax() {
        NumRange range = new NumRange("1-");
        range.setMaxnum(4);
        List<Integer> result = new ArrayList<Integer>(5);
        for (Integer n : range) {
            result.add(n);
            if (n >= 5) break;
        }
        Assert.assertEquals(Arrays.asList(1, 2, 3, 4), result);
    }

    @Test
    public void testUnboundedMax1() {
        NumRange range = new NumRange("2-");
        range.setMaxnum(2);
        List<Integer> result = new ArrayList<Integer>(5);
        for (Integer n : range) {
            result.add(n);
            if (n >= 5) break;
        }
        Assert.assertEquals(Arrays.asList(2), result);
    }
}
