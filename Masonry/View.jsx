/* ================
# Masonry Component
With infinite scrolling and virtualized list rendering.

## Features:
- Multi-column spanning
- 

## Opinionated:
- Columns are fixed-width
- Cell items have pre-determined height

- Layout is calculated before render
- Layout is only done if:
  A) Number of props.items changes
  B) New page is fetched
  

## How to layout your item:
class Item extends React.Component {
  static getColumnSpanFromProps = ({ isFeatured }, getState) => {
    if (isFeatured) {
      return 2;
    }

    return 1;
  }

  static getHeightFromProps = () => {
    return IMAGE_HEIGHT + TITLE_HEIGHT + FOOTER_HEIGHT;
  }
  
  render() {
    ...
  }
}

================== */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import throttle from 'lodash.throttle';

const noPage = { stop: 0 };
const defaultColumnSpanSelector = () => 1;

export default class Masonry extends React.PureComponent {
  static propTypes = {
    alignCenter: PropTypes.bool.isRequired,
    className: PropTypes.any,
    columnGutter: PropTypes.number.isRequired,
    columnWidth: PropTypes.number.isRequired,
    hasMore: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool.isRequired,
    items: PropTypes.array.isRequired,
    itemComponent: PropTypes.oneOf([
      PropTypes.instanceOf(React.Component),
      PropTypes.function
    ]).isRequired,
    itemProps: PropTypes.object,
    onInfiniteLoad: PropTypes.function.isRequired,
    threshold: PropTypes.number.isRequired,
    scrollAnchor: PropTypes.object,
    scrollOffset: PropTypes.number,
  }

  static defaultProps = {
    alignCenter: true,
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
    this.layout(this.props);
  }, 150, { trailing: true })

  layout(props) {
    if (!this.node) {
      return;
    }

    const {
      columnWidth,
      columnGutter,
      items
    } = props;

    // Decide a starter position for centering
    const viewableWidth = this.node.offsetWidth;
    const viewableHeight = this.getViewableHeight();
    const maxColumns = Math.floor(viewableWidth / (columnWidth + columnGutter));
    const spannableWidth = maxColumns * columnWidth + (columnGutter * (maxColumns - 1));
    const viewableStart = this.props.alignCenter ? (viewableWidth - spannableWidth) / 2 : 0;

    // Setup bounds and limiters for deciding how to stage items in a page
    const itemsPerPage = maxColumns * Math.ceil(viewableHeight / this.state.averageHeight);
    const top = Math.max(0, this.getScrollTop() + this.getScrollOffset());

    let column = 0;

    const stagedItems = [];
    const pages = items.reduce((workingPages, component) => {
      // Decide which page we are on
      let workingPage = null;

      if (workingPages.length) {
        workingPage = workingPages[workingPages.length - 1];
      }

      if (!workingPage || workingPage.items.length >= itemsPerPage) {
        workingPage = { index: workingPages.length, items: [] };
        workingPages.push(workingPage);
      }

      // Determine the height of this item to stage
      const componentName = component.type.displayName || component.type.name;

      // Ok now we have an item, let's decide how many columns it spans
      const columnSpanSelector = component.constructor.getColumnSpanFromProps || component.type.getColumnSpanFromProps || defaultColumnSpanSelector;
      const columnSpan = Math.min(maxColumns, columnSpanSelector(component.props, props.getState));

      // Check if the column will exceed maxColumns
      if (column + columnSpan > maxColumns) {
        column = 0;
      }

      // I'm not sure what's the proper way to honor Redux-wrapped and standard components
      if (!('getHeightFromProps' in component.constructor) && !('getHeightFromProps' in component.type)) {
        throw new Error(`Component type ${componentName} does not respond to 'getHeightFromProps'`);
      }

      const selector = component.constructor.getHeightFromProps || component.type.getHeightFromProps;
      const height = selector(component.props, columnSpan, props.getState);

      if (isNaN(height)) {
        console.warn(`Skipping feed item ${componentName} with props ${JSON.stringify(component.props)} because "${height}" is not a number.`);
        return workingPages;
      }

      const item = {
        component,
        column,
        columnSpan,
        left: viewableStart + column * (columnWidth + columnGutter),
        top: 0,
        height,
        width: (columnSpan * columnWidth) + ((columnSpan - 1) * columnGutter)
      };

      // console.warn(componentName, "index:", index, "column:", column, "on page", workingPages.length-1);

      // Here is where the magic happens
      // First we take a slice of the items above
      const previousSlicedItems = stagedItems.slice(-1 * itemsPerPage);

      // But we only care about the same column
      const upperItems = this.findItemsInSameColumn(previousSlicedItems, item);

      // And we want to fill gaps if possible
      const upperItemsBeforeGap = this.findItemsBeforeFillableGaps(upperItems, height);

      if (upperItemsBeforeGap.length) {
        const upperMostPregapItem = upperItemsBeforeGap[0];
        item.left = upperMostPregapItem.left;
        upperMostPregapItem.top = upperMostPregapItem.top + upperMostPregapItem.height + columnGutter;
      } else {
        // No gaps to fill, so stage it at the end
        const upperItemsOffsetTops = upperItems.map(upperItem =>
          upperItem.top + upperItem.height + columnGutter
        ).concat(0);

        item.top = Math.max.apply(Math, upperItemsOffsetTops);
      }

      column += columnSpan;

      workingPage.items.push(item);
      stagedItems.push(item);

      return workingPages;
    }, []).map(page => {
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

    this.setState({ averageHeight, pages });
  }

  findItemsBeforeFillableGaps = (items, height) => {
    const columnItemsCache = {};

    return items.filter(upperItem => {
      // Lazy detect items in each column
      const columnKey = upperItem.column.toString();
      if (!(columnKey in columnItemsCache)) {
        columnItemsCache[columnKey] = this.findItemsInSameColumn(items, upperItem).sort((a, b) => a.top < b.top ? -1 : 1);
      }

      const columnItems = columnItemsCache[columnKey];

      // Iterate through column, looking for gaps
      for (let i = 0; i < columnItems.length; i++) {
        const thisItemInColumn = columnItems[i];
        const nextItemInColumn = columnItems[i];

        if (nextItemInColumn && nextItemInColumn.top - thisItemInColumn.top >= height) {
          return true;
        }
      }

      return false;
    }).sort((a, b) => a.top < b.top ? -1 : 1);
  }

  findItemsInSameColumn(itemList, item) {
    return itemList.filter(upperItem => {
      return item.column === upperItem.column ||
      (
        (item.component.props.featured && item.column + 1 === upperItem.column) ||
        (upperItem.component.props.featured && upperItem.column + 1 === item.column)
      );
    });
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
    // console.log("Checking page", page.index);
    // console.group();
    // console.log(`top: ${top}, start: ${start}, stop: ${stop}, viewableHeight: ${viewableHeight}`);

    // trigger area = viewable area with buffer areas
    if (
      (start >= top - extraThreshold && stop <= top + viewableHeight + extraThreshold) || // If page starts and stops within the trigger area
      (start <= top + extraThreshold && stop >= top - extraThreshold) || // If page starts before and runs within trigger area
      (start >= top - extraThreshold  && start <= top + viewableHeight + extraThreshold) || // If page starts within the trigger area
      (stop > top - extraThreshold && stop <= top + viewableHeight + extraThreshold) // If the page stops within the trigger area
    ) {
      /* console.log("starts and stops within area", (start >= top && stop <= top + viewableHeight) );
      console.log("starts before and runs within area", (start <= top && stop > top + viewableHeight));
      console.log("starts within and stops after area", (start > top && stop > top + viewableHeight));
      console.groupEnd();*/
      return true;
    }

    // console.error(page.index, "did not appear");
    // console.groupEnd();
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
      className,
      hasMore,
      isLoading,
      itemProps,
      itemComponent: Item,
      ...otherProps
    } = this.props;

    const {
      pages
    } = this.state;

    const height = (pages[pages.length - 1] || noPage).stop;

    return (
      <div
        ref={this.onReference}
        className={classNames('masonry', className)}>
        <div
          className="masonry-view"
          style={{ height: height + 'px' }}>
          {pages.map((page, index) => {
            if (!page.visible) {
              return null;
            }

            return (
              <div
                className="masonry-page"
                key={index}
                data-page={index}>
                {page.items.map(({ component, left, top, width, columnSpan }, itemIndex) => {
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
                      {...itemProps}>
                      {component}
                    </Item>
                  );
                })}
              </div>
            );
          })}
        </div>
        {hasMore && isLoading && (
          <div className="loading-cap">
            Loading next page...
          </div>
        )}
      </div>
    );
  }
}
