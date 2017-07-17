/**
 * Masonry Component for React
 * @author Cole Turner <turner.cole@gmail.com | www.cole.codes>
 * 
 * If you use this, please retain the author name.
 * Please PR any new features you add so that others can enjoy
 * the blood sweat and tears of open source.
 * 
 * Features:
 *  - Masonry Layout
 *    A) Items must have fixed column width
 *    B) Items can span multiple columns
 *    C) Layout will be precalculated but only if the number of items has changed
 *        - This engine was designed for a static order placement
 *          and was not designed for reordering
 *    D) New items will layout if the previous layout parameters still apply
 *    E) Function `getState` returns either Redux or local component state
 *  - Infinite Scroll
 * 
 * 
 * How to use:
    const myArrayOfItems = [{ name: 'Hello' }, { name: 'World' }]
    <Masonry
      items={myArrayOfItems}
      itemComponent={MyMasonryItem}
      alignCenter={true}
      containerClassName="masonry"
      layoutClassName="masonry-view"
      pageClassName="masonry-page"
      loadingElement={<span>Loading...</span>}
      columnWidth={columnWidth}
      columnGutter={columnGutter}
      hasMore={this.props.hasMore}
      isLoading={this.props.isFetching}
      onInfiniteLoad={this.onFetch}
      getState={this.props.getState}
    />

*  How to layout your item:
    class MyMasonryItem extends React.Component {
      static getColumnSpanFromProps = ({ isFeatured }, getState) => {
        if (isFeatured) {
          return 2;
        }
        return 1;
      }
      static getHeightFromProps = (getState, props, columnSpan, columnGutter) => {
        return IMAGE_HEIGHT + TITLE_HEIGHT + FOOTER_HEIGHT;
      }
      
      render() {
        ...
      }
    }
 */


import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import throttle from 'lodash.throttle';

const noPage = { stop: 0 };
const defaultColumnSpanSelector = () => 1;
const sortAscending = (a, b) => a - b;
const sortTopByAscending = (a, b) => a.top - b.top;
const classNamePropType = PropTypes.oneOfType([
    PropTypes.String,
    PropTypes.array
  ]).isRequired;

export default class Masonry extends React.PureComponent {
  static propTypes = {
    alignCenter: PropTypes.bool.isRequired,
    columnGutter: PropTypes.number.isRequired,
    columnWidth: PropTypes.number.isRequired,
    containerClassName: classNamePropType,
    layoutClassName: classNamePropType,
    pageClassName: classNamePropType,
    hasMore: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool.isRequired,
    items: PropTypes.array.isRequired,
    itemComponent: PropTypes.oneOf([
      PropTypes.instanceOf(React.Component),
      PropTypes.function
    ]).isRequired,
    itemProps: PropTypes.object,
    loadingElement: PropTypes.node,
    onInfiniteLoad: PropTypes.function.isRequired,
    threshold: PropTypes.number.isRequired,
    scrollAnchor: PropTypes.object,
    scrollOffset: PropTypes.number,
  }

  static defaultProps = {
    alignCenter: true,
    containerClassName: 'masonry collection-group',
    layoutClassName: 'masonry-view',
    pageClassName: 'masonry-page',
    loadingElement: (
      <div className="loading-cap">
        <AnimatedGem animate={true} />
      </div>
    ),
    scrollAnchor: window,
    threshold: window.innerHeight * 2
  }

  state = { averageHeight: 300, pages: [] }

  componentDidMount() {
    this.layout(this.props);
    this.onScroll();
    document.addEventListener('scroll', this.onScroll);
    window.addEventListener('resize', this.onResize);
  }

  componentWillUnmount() {
    document.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.items.length !== this.props.items.length) {
      this.layout(nextProps);
    }
  }

  onResize = throttle(() => {
    this.layout(this.props, true);
  }, 150, { trailing: true })

  layout(props, rearrange=false) {
    if (!this.node) {
      return;
    }

    const {
      columnWidth,
      columnGutter,
      items,
      itemComponent
    } = props;

    const componentName = itemComponent.type.displayName || itemComponent.type.name;

    if (!('getHeightFromProps' in component.constructor) && !('getHeightFromProps' in component.type)) {
      throw new Error(`Component type ${componentName} does not respond to 'getHeightFromProps'`);
    }

    const heightSelector = itemComponent.constructor.getHeightFromProps || itemComponent.type.getHeightFromProps;
    const columnSpanSelector = itemComponent.constructor.getColumnSpanFromProps || itemComponent.type.getColumnSpanFromProps || defaultColumnSpanSelector;


    // Decide a starter position for centering
    const viewableWidth = this.node.offsetWidth;
    const viewableHeight = this.getViewableHeight();
    const maxColumns = Math.floor(viewableWidth / (columnWidth + columnGutter));
    const spannableWidth = maxColumns * columnWidth + (columnGutter * (maxColumns - 1));
    const viewableStart = this.props.alignCenter ? (viewableWidth - spannableWidth) / 2 : 0;

    // Setup bounds and limiters for deciding how to stage items in a page
    const itemsPerPage = maxColumns * Math.ceil(viewableHeight / this.state.averageHeight);
    const top = Math.max(0, this.getScrollTop() + this.getScrollOffset());

    // Here we decide if we layout the entire grid or just new items
    const shouldRearrange = (
      rearrange ||
      !this.state.lastWorkingPage ||
      this.state.lastWorkingIndex === null ||
      maxColumns !== this.state.maxColumns
    );

    // Setup our boundaries for layout
    const columnHeights = shouldRearrange ? new Array(maxColumns).fill(0) : this.state.columnHeights;
    const columnGaps = shouldRearrange ? new Array(maxColumns).fill([]) : this.state.columnGaps;

    const initialWorkingPages = shouldRearrange ? [] : this.state.pages;
    const itemsToLayout = shouldRearrange ? items : items.slice(this.state.lastWorkingIndex + 1);

    let column = 0;
    let lastWorkingIndex = null;

    const stagedItems = [];
    const pages = itemsToLayout.reduce((workingPages, itemProps) => {
      // Decide which page we are on
      let workingPage = null;

      if (workingPages.length) {
        workingPage = workingPages[workingPages.length - 1];
      }

      if (!workingPage || workingPage.items.length >= itemsPerPage) {
        workingPage = { index: workingPages.length, items: [] };
        workingPages.push(workingPage);
      }

      // Ok now we have an item, let's decide how many columns it spans
      const columnSpan = Math.min(maxColumns, columnSpanSelector(props.getState, itemProps));

      // Check if the column will exceed maxColumns
      if (column + columnSpan > maxColumns) {
        column = 0;
      }

      // Determine the height of this item to stage
      const height = heightSelector(props.getState, itemProps, columnSpan, columnGutter);

      if (isNaN(height)) {
        console.warn(`Skipping feed item ${componentName} with props ${JSON.stringify(itemProps)} because "${height}" is not a number.`);
        return workingPages;
      }

      const item = {
        props: itemProps,
        column,
        columnSpan,
        height,
        width: (columnSpan * columnWidth) + ((columnSpan - 1) * columnGutter)
      };

      // Here is where the magic happens
      // First we take a slice of the items above
      const previousSlicedItems = stagedItems.slice(-1 * itemsPerPage);

      // Let's fill any gaps if possible.
      const positionWithinGap = this.findPositionInGaps(
        Object.values(columnGaps),
        maxColumns,
        columnSpan,
        height,
        viewableStart
      );

      if (positionWithinGap) {
        Object.assign(item, positionWithinGap);
      } else {
        // And then for good measure, transverse up a little more to catch any items staged below
        stagedItems.slice(stagedItems.length - 1 - itemsPerPage, -1 * itemsPerPage).forEach(previousItem => {
          if (previousSlicedItems.some(previousSlicedItem => previousSlicedItem.top < previousItem.top)) {
            previousSlicedItems.push(previousItem);
          }
        });

        previousSlicedItems.sort(sortTopByAscending);

        // Then find the smallest column
        const position = this.findPositionForItem(previousSlicedItems, columnSpan, maxColumns, columnHeights, height, viewableStart);
        Object.assign(item, position);
      }

      const minPreviousSlicedItemTop = Math.min(...previousSlicedItems.map(i => i.top));

      columnHeights
        .slice(item.column, item.column + columnSpan)
        .forEach((thisColumn, index) => {
          // Remove any gaps we're overlaying
          columnGaps[item.column + index] = columnGaps[item.column + index].filter(gap => {
            const [gapTop, gapHeight] = gap;
            if (
              // If we filled the gap
              (item.top <= gapTop && item.top + item.height >= gapTop) ||
              (item.top >= gapTop && item.top <= gapTop + gapHeight) ||
              // or if the gap is above our fill zone
              gapTop < minPreviousSlicedItemTop
            ) {
              return false;
            }

            return true;
          });

          // Add a gap if we've created one
          if (item.top > thisColumn) {
            columnGaps[item.column + index].push([
              thisColumn,
              item.top - thisColumn - this.props.columnGutter
            ]);
          }

          columnHeights[item.column + index] = Math.max(thisColumn, item.top + item.height + columnGutter);
        });


      column += columnSpan;

      workingPage.items.push(item);
      stagedItems.push(item);
      lastWorkingIndex = items.indexOf(itemProps); // not `item`!!

      return workingPages;
    }, initialWorkingPages).map(page => {
      // Calculate when a page starts and stops
      // To determine which pages are visible
      const itemsTop = page.items.map(item => item.top);

      page.start = (!itemsTop.length ? 0 : Math.min(...itemsTop));
      page.stop = (Math.max(0, ...page.items.map(item => item.top + item.height)));

      page.visible = this.isPageVisible({ page, top, viewableHeight });

      return page;
    });

    // Facilitate the average height for next layout's itemsPerPage
    const averageHeight = Math.round(stagedItems.map(item => item.height).reduce((prev, val) => prev + val, 0) / stagedItems.length);

    this.setState({
      pages,
      lastWorkingIndex,
      averageHeight,
      columnHeights,
      columnGaps,
      maxColumns
    });
  }

  findPositionForItem(previousItems, columnSpan, maxColumns, columnHeights, itemHeight, viewableStart) {
    // If it spans one column, return the shortest column
    if (columnSpan === 1) {
      const smallestHeight = columnHeights.slice(0).sort(sortAscending)[0];
      const column = columnHeights.indexOf(smallestHeight);
      const left = Math.round(this.getLeftPositionForColumn(column, viewableStart));
      const top = Math.round(columnHeights[column]);

      return {
        column,
        left,
        top
      }
    }

    // Find columns to span that will create the shortest gap
    const columnGaps = columnHeights
      .slice(0, maxColumns - columnSpan + 1) // only measure columns it can span
      .reduce((gapReduction, thisColumnHeight, column) => {

        if (thisColumnHeight < columnHeights[column + 1]) {
          // If this item clips the next column, overextend
          gapReduction[column] = columnHeights[column + 1];
        } else {
          // Determine how much of a gap will be created if we start in this column
          const columnsToMeasure = columnHeights
            .slice(column, column + columnSpan);

          gapReduction[column] = Math.max(...columnsToMeasure) - Math.min(...columnsToMeasure);
        }
        return gapReduction;
      }, []);

    const column = columnGaps.indexOf(columnGaps.slice(0).sort(sortAscending)[0]);
    const maxSpannedHeight = Math.max(...columnHeights.slice(column, column + columnSpan));
    const top = Math.round(maxSpannedHeight);
    const left = Math.round(this.getLeftPositionForColumn(column, viewableStart));

    return {
      column,
      left,
      top
    };
  }

  findPositionInGaps = (gapColumns, maxColumns, columnSpan, height, viewableStart) => {
    if (columnSpan === 1) {
      // Easy, find the first gap

      for (let column = 0; column < gapColumns.length; column++) {
        const testColumn = gapColumns[column];
        const gap = testColumn.find(g => g[1] >= height);

        if (gap) {
          const left = Math.round(this.getLeftPositionForColumn(column, viewableStart));

          //console.log("filled by single gap", gapColumns);
          return {
            left,
            top: gap[0],
            column
          }
        }
      }
    }

    if (!gapColumns.some(column => column.length > 0)) {
      return null;
    }

    // Much more difficult
    // only measure columns it can span
    const fillableColumnGaps = gapColumns
      .slice(0, maxColumns - columnSpan + 1)
      .reduce((workingColumns, thisColumnGaps, columnIndex) => {
        workingColumns[columnIndex] = thisColumnGaps.filter(g => g[1] >= height);
        return workingColumns;
      }, new Array(gapColumns.length).fill([]));

    // Sorry this is going to get verbose
    const spannableColumnGaps = fillableColumnGaps.reduce((acc, thisColumn, index) => {
      // Filter out columns
      acc[index] = thisColumn.filter(thisColumnGap => {
        const [thisColumnGapTop, thisColumnGapHeight] = thisColumnGap;

        // Where the item can't span next columns
        const nextColumns = fillableColumnGaps.slice(index + 1);
        return nextColumns.every(nextSpannableColumn => {
          // By looking for a gap it can fit into
          return nextSpannableColumn.find(nextSpannableColumnGap => {
            const [nextSpannableColumnGapTop, nextSpannableColumnGapHeight] = nextSpannableColumnGap;

            // only if it can slide right in there ;)
            return (
              nextSpannableColumnGapTop <= thisColumnGapTop &&
              nextSpannableColumnGapTop + nextSpannableColumnGapHeight >= thisColumnGapTop + thisColumnGapHeight
            );
          });
        });
      });

      return acc;
    }, new Array(fillableColumnGaps.length).fill([]));

    // Now interate through the message
    for (let column = 0; column < spannableColumnGaps.length; column++) {
      if (spannableColumnGaps[column].length) {
        const gap = spannableColumnGaps[column][0];
        const left = Math.round(this.getLeftPositionForColumn(column, viewableStart));

        //console.log("filled by spannable gap");
        return {
          left,
          top: gap[0],
          column
        }
      }
    }

    // I have failed you
    return null;
  }


  findItemsInSameColumn(itemList, item) {
    return itemList.filter(upperItem => {
      return item.column === upperItem.column ||
        (
          item.column >= upperItem.column &&
          item.column + item.columnSpan <= upperItem.column + upperItem.columnSpan
        );
    });
  }

  getLeftPositionForColumn(column, viewableStart) {
    return viewableStart + (column * (this.props.columnWidth + this.props.columnGutter));
  }

  onScroll = throttle(() => {
    if (!this.node) {
      return;
    }

    const bounds = this.node.getBoundingClientRect();

    this.checkVisibility(bounds);
    this.checkInfiniteLoad(bounds);
  }, 100, { leading: true, trailing: true })

  checkVisibility() {
    const viewableHeight = this.getViewableHeight();
    const top = Math.max(0, this.getScrollTop() - this.getScrollOffset());

    let isChanged = false;

    const pages = this.state.pages.map(page => {
      const visible = this.isPageVisible({ page, top, viewableHeight });

      isChanged = isChanged || page.visible !== visible;

      return {
        ...page,
        visible
      };
    });

    if (isChanged) {
      this.setState({ pages });
    }
  }

  isPageVisible({ page, top, viewableHeight }) {
    const { start, stop } = page;
    const extraThreshold = viewableHeight;
    // trigger area = viewable area with buffer areas
    if (
      (start >= top - extraThreshold && stop <= top + viewableHeight + extraThreshold) || // If page starts and stops within the trigger area
      (start <= top + extraThreshold && stop >= top - extraThreshold) || // If page starts before and runs within trigger area
      (start >= top - extraThreshold  && start <= top + viewableHeight + extraThreshold) || // If page starts within the trigger area
      (stop > top - extraThreshold && stop <= top + viewableHeight + extraThreshold) // If the page stops within the trigger area
    ) {
      return true;
    }
  
    return false;
  }

  checkInfiniteLoad(bounds) {
    if (this.props.scrollAnchor === window) {
      if (bounds.top + bounds.height < window.innerHeight + this.props.threshold) {
        this.props.onInfiniteLoad();
        return;
      }

      return;
    } else if (this.props.threshold > this.props.scrollAnchor.scrollHeight - this.getScrollTop()) {
      this.props.onInfiniteLoad();
      return;
    }
  }

  getScrollTop() {
    if (this.props.scrollAnchor === window) {
      return window.pageYOffset;
    }

    return this.props.scrollAnchor.scrollTop;
  }

  getScrollOffset() {
    if (this.props.scrollAnchor === window) {
      return this.node.offsetTop;
    }

    return this.props.scrollOffset;
  }

  getViewableHeight() {
    if (this.props.scrollAnchor === window) {
      return window.innerHeight;
    }

    return this.props.scrollAnchor.offsetHeight;
  }

  onReference = (node) => this.node = node;

  render() {
    const {
      containerClassName,
      layoutClassName,
      pageClassName,
      hasMore,
      loadingElement,
      isLoading,
      itemProps,
      itemComponent: Item,
    } = this.props;

    const {
      pages
    } = this.state;

    const layoutHeight = (pages[pages.length - 1] || noPage).stop;

    return (
      <div
        ref={this.onReference}
        className={classNames(containerClassName)}>
        <div
          className={classNames(layoutClassName)}
          style={{ height: `${layoutHeight}px`, position: 'relative' }}>
          {pages.map((page, index) => {
            if (!page.visible) {
              return null;
            }

            return (
              <div
                className={classNames(pageClassName)}
                key={index}>
                {page.items.map(({ props, left, top, width, height, columnSpan }, itemIndex) => {
                  return (
                    <Item
                      key={itemIndex}
                      columnSpan={columnSpan}
                      style={{
                        position: 'absolute',
                        left: left + 'px',
                        top: top + 'px',
                        width: width + 'px'
                      }}
                      {...props}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
        {hasMore && isLoading && loadingElement}
      </div>
    );
  }
}
