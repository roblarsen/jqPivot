/*
 * jqPivot, an advanced grid plugin for jQuery. 
 * (c) Rob Larsen, 2012
 */

// Tells the browser to use ES5 strict mode, if supported
"use strict";

;(function ( $, window, document, undefined ) {
    var PIVOT_NAMESPACE = "jqPivot",
        DATA_CURRENT_COLUMN_NUMBER = "currColNum",
        DATA_ROW_HEIGHT = "rowHeight";
        
    var $document = $(document);

    function bind(scope, fn){
        return function () {
                fn.apply(scope, arguments);
                }
    }
        
    // Defines the base class for the Viewports
     function JqPivotBaseViewport(){
        this.currentPage = 0;
        this.rowHeight = -1;
        this.options = null;
        this.requestedGridDataRange = null;
        this.currentGridData = null;
        this.currentRowOffset = 0;
    }
     // Viewport classes

    // Viewport base class
    JqPivotBaseViewport.prototype._super = function () {};
    JqPivotBaseViewport.prototype.requestDataCallback = function (object) {};
    JqPivotBaseViewport.prototype.initialize = function (options) {
        this.options = options;
    };
    /**
    * This method gets called by the jqPivot plugin when it is ready to generate the inner table.
    * 
    * @method
    * @param {object} innerTableContainer	A JQuery element representing the inner table container, generally it is a <td/>
    * @return {object}			            The inner table container passes as input parameter containing the inner table. The returned object is assumed to be a JQuery object.
    */
    JqPivotBaseViewport.prototype.createInnerTable = function (innerTableContainer) { throw new Error("createInnerTable method is not implemented.");};
    /**
    * Invoked by the jqPivot plugin when it has o populate the rows with data.
    * This method will be called several times if there is the row virtualization enabled.
    * 
    * @method
    * @param {object} data	a two dimensional array representing the table data.
    * @return {undefined}
    */
    JqPivotBaseViewport.prototype._populateGridwithData = function (data) {throw new Error("populateGridwithData method is not implemented.");};
    JqPivotBaseViewport.prototype.maxRowsNumber = function (value) {
        // no value passed, act as a getter
		if ( value === undefined ) {
			return this.options.maxRowsNumber;
		// value passed, act as a setter
		} else {
			this.options.maxRowsNumber = value;
            this._calculateScrollingAreaSize();
		}
    };

    JqPivotBaseViewport.prototype._calculateScrollingAreaSize = function() {}

    /**
    * Get the column header description for the column with the passed index
    * 
    * @private
    * @param {number} columnIndex	The index of the column.
    * @return {number}              Return the column header text if the index for the passed column is specified otherwise it return an HTML blank space.
    */
    JqPivotBaseViewport.prototype._getColumnHeaderFromIndex = function (columnIndex){
        var retVal,
            colCnt = 0,
            options = this.options;

        if (options != null && options.columnHeaders != null){
            colCnt = options.columnHeaders.length;
        }
        if (colCnt < 1 || columnIndex >= colCnt){
            retVal = "&nbsp;";
        }
        else{
            retVal = options.columnHeaders[columnIndex];
        }

        return retVal;
    };

    JqPivotBaseViewport.prototype._raiseRequestDataCallback = function (from, to) {
        if (this.requestDataCallback == null){
            return;
        }

        this.requestedGridDataRange = {from:from, to:to, gridData:null};
        this.requestDataCallback(this.requestedGridDataRange);
    }

    JqPivotBaseViewport.prototype.setDataFromRequest = function (data) {
        if (data != this.requestedGridDataRange)
            return;

        this.currentRowOffset = data.from;
        this.requestedGridDataRange = null;
        this._populateGridwithData(data.gridData);
    }

    // Defines the class jqPivotPagingViewport
    function jqPivotPagingViewport (){
        this._super.constructor.call(this);
        this.$innerTable = null;
        this.$scroller = null;
        this.$fakeContent = null;
        this.scrollerThumbPosition = 0;
        this.currentLastRow = 0;
    }
    
    //Take care of the inheritance first
    jqPivotPagingViewport.prototype = new JqPivotBaseViewport(null);
    jqPivotPagingViewport.prototype.constructor = jqPivotPagingViewport;
    jqPivotPagingViewport.prototype._super = JqPivotBaseViewport.prototype;
    jqPivotPagingViewport.prototype._calculateScrollingAreaSize = function() {

        var maxRowsNumber = this.maxRowsNumber(),
            rowHeight = this.rowHeight;
        if ((rowHeight < 1) || (this.$scroller.height() < 1) || (maxRowsNumber < 1)) {
            return;
        }

        var scrollerContentHeight = maxRowsNumber * rowHeight,
            currentVisibility;

        this.$fakeScrollerContent.css("height",scrollerContentHeight+"px");

        if (scrollerContentHeight < 1){
            currentVisibility = "none";
        } else {
            currentVisibility = "block";
        }

        this.$scroller.css("display",currentVisibility);
    };

    //then define the prototype methods

    /**
    * This method gets called by the jqPivot plugin when it is ready to generate the inner table.
    * 
    * @method
    * @param {object} innerTableContainer	A JQuery element representing the inner table container, generally it is a <td/>
    * @return {object}			            The inner table container passes as input parameter containing the inner table. The returned object is assumed to be a JQuery object.
    */
    jqPivotPagingViewport.prototype.createInnerTable = function (innerTableContainer) {

        this.$innerTable = $("<table />").addClass("jqPivotInnerTable");

        var $innerTableContainer = $(innerTableContainer);

        // Create the inner table and the scroller
        var $innerTableTBody = $("<tbody />"),
            $scroller = $("<div />")
                            .attr("id","scroller")
                            .css({ 
                                    "width":"18px",
                                    "height":"0px",
                                    "overflow-y":"scroll",
                                    "overflow-x":"hidden",
                                    "position":"absolute",
                                    "right":"0px",
                                    "top":"0px",
                                    "border":"1px solid green",
                                    "display":"none"
                                    }),
            $fakeScrollerContent = $("<div />")
                            .attr("id","fake")
                            .css({ 
                                    "height":"0px",
                                    "width":"1px"
                                    });

        $scroller.append($fakeScrollerContent);

        this.$innerTable.append($innerTableTBody);
        $innerTableContainer.append(this.$innerTable)
                            .append($scroller)
                            .append($("<div/>").attr("id","cap"));

        $scroller.on("scroll", bind(this, function onScroll () {
            var thumb = arguments[0].currentTarget,
                thumbPosition = thumb.scrollTop,
                rowHeight = this.rowHeight,
                topRowPos = Math.round(thumbPosition / rowHeight),
                gridRows = this.options.gridRows,
                bottomRowPos = topRowPos + gridRows;

            if (bottomRowPos ==  this.currentLastRow){
                return;
            }

            // If this scroll function gets requested several time all the duplicates will not go through.
            if ((this.requestedGridDataRange != null) &&
                (this.requestedGridDataRange.from == topRowPos) &&
                (this.requestedGridDataRange.to == bottomRowPos)) {
                return;
            }

            thumb.scrollTop = (topRowPos) * rowHeight;

            //Calculate the next set of data

            // If the requested data are between the offset and the lenght of the cache we take the data from the cache.
            if ((topRowPos >= this.currentRowOffset) &&
                (bottomRowPos <= this.currentRowOffset + this.currentGridData.length)){
                var data = this.currentGridData.slice(topRowPos-this.currentRowOffset, bottomRowPos-this.currentRowOffset);

                this._populateGridwithData(data);
                
                this.currentLastRow = bottomRowPos; // we add the previous position to the new row position
            }
            else {// Otherwise we send a request to the grid that we need data.
                this.currentGridData = null;
                this._raiseRequestDataCallback(topRowPos, bottomRowPos);
            }

            this.scrollerThumbPosition = thumbPosition;
        }));

        this.$scroller = $scroller;
        this.$fakeScrollerContent = $fakeScrollerContent;
    };

    /**
    * Invoked by the jqPivot plugin when it has o populate the rows with data.
    * This method will be called several times if there is the row virtualization enabled.
    * 
    * @method
    * @param {object} data	a two dimensional array representing the table data.
    * @return {undefined}
    */
    jqPivotPagingViewport.prototype._populateGridwithData = function (data) {

        if (!this.$innerTable){
            return;
        }

        // Clean up the existing rows if any.
        var $innerTableTBody = this.$innerTable.find("tbody:last");
        $innerTableTBody.find("tr").remove();

       
        var $currentCell,
            $currentRow,
            columnCount,
            cellClasses,
            currentCellName,
            cnt = data.length,
            leftCellClassName = this.options.leftCellClassName,
            rightCellClassName = this.options.rightCellClassName,
            gridRowClassName = this.options["gridRowClassName"],
            gridRows = this.options.gridRows;

        if ((gridRows > 0) && (cnt > gridRows)){
            cnt = gridRows;
        }

        if (this.currentGridData == null){
            this.currentGridData = data;
        }

        for (var a = 0; a < cnt; a++){

            columnCount = data[a].length;
            $currentRow = $("<tr/>");
            cellClasses = gridRowClassName+" "+leftCellClassName;

            for (var b = 0; b < columnCount; b++){
                
                if (b == columnCount-1){
                    cellClasses = gridRowClassName+" "+rightCellClassName;
                }

                currentCellName = this._getColumnHeaderFromIndex(b);
                $currentCell = $("<td />")
                                    .addClass(cellClasses)
                                    .addClass("column"+currentCellName)
                                    .attr("id",(a+1).toString()+"_"+(b+1).toString())
                                    .append(data[a][b]);
                $currentRow.append($currentCell);
            }
                
            $innerTableTBody.append($currentRow);

            // Saves the row height of the first row as the base height of all the rows.
            if (a == 0){
                this.rowHeight = $currentRow.height();
            }
        }

        this.currentLastRow = cnt;

        // Make sure that we are populating the scroller height only once and after it was created
        if (this.$scroller.height() < 1)
            this.$scroller.height((this.$innerTable.height()-3)+"px");
        
        this._calculateScrollingAreaSize();
     }

    // Defines the class jqPivotScrollingViewport
    function jqPivotScrollingViewport (){
        this._super.constructor.call(this);
        this.$innerTable = null;
    }
    //Take care of the inheritance first
    jqPivotScrollingViewport.prototype = new JqPivotBaseViewport(null);
    jqPivotScrollingViewport.prototype.constructor = jqPivotScrollingViewport;
    jqPivotScrollingViewport.prototype._super = JqPivotBaseViewport.prototype;

     /**
    * This method gets called by the jqPivot plugin when it is ready to generate the inner table.
    * 
    * @method
    * @param {object} innerTableContainer	A JQuery element representing the inner table container, generally it is a <td/>
    * @return {object}			            The inner table container passes as input parameter containing the inner table. The returned object is assumed to be a JQuery object.
    */
    jqPivotScrollingViewport.prototype.createInnerTable = function (innerTableContainer) {

        this.$innerTable = $("<table />").addClass("jqPivotInnerTable")
                                         .css({ 
                                                "overflow-y":"scroll",
                                                "overflow-x":"hidden"
                                                })
                                         .append($("<tbody />"));

       $(innerTableContainer).append(this.$innerTable);
    }

    
    /**
    * Invoked by the jqPivot plugin when it has o populate the rows with data.
    * This method will be called several times if there is the row virtualization enabled.
    * 
    * @method
    * @param {object} data	a two dimensional array representing the table data.
    * @return {undefined}
    */
    jqPivotScrollingViewport.prototype._populateGridwithData = function (data) {

        if (!this.$innerTable){
            return;
        }

        // Clean up the existing rows if any.
        var $innerTableTBody = this.$innerTable.find("tbody:last");
       
        var $currentCell,
            $currentRow,
            columnCount,
            cellClasses,
            currentCellName,
            cnt = data.length,
            leftCellClassName = this.options.leftCellClassName,
            rightCellClassName = this.options.rightCellClassName,
            gridRowClassName = this.options["gridRowClassName"],
            gridRows = this.options.gridRows;

        if (this.currentGridData == null){
            this.currentGridData = data;
        }

        for (var a = 0; a < cnt; a++){

            columnCount = data[a].length;
            $currentRow = $("<tr/>");
            cellClasses = gridRowClassName+" "+leftCellClassName;

            for (var b = 0; b < columnCount; b++){
                
                if (b == columnCount-1){
                    cellClasses = gridRowClassName+" "+rightCellClassName;
                }

                currentCellName = this._getColumnHeaderFromIndex(b).replace(/\s|\&nbsp;+/g, '');
                $currentCell = $("<td />")
                                    .addClass(cellClasses)
                                    .attr("id",(a+1).toString()+"_"+(b+1).toString())
                                    .append(data[a][b]);
                
                if (currentCellName.length > 0){
                    $currentCell.addClass("column"+currentCellName);
                }
                
                $currentRow.append($currentCell);
            }
                
            $innerTableTBody.append($currentRow);

            // Saves the row height of the first row as the base height of all the rows.
            if (a == 0){
                this.rowHeight = $currentRow.height();
            }
        }

        this.currentLastRow = cnt;
        if (gridRows > 0) {
            this.$innerTable.height(this.rowHeight * gridRows);
        }

        this.$innerTable.on("scroll", bind(this, function onScroll () {
        }));

     }
    $.widget( PIVOT_NAMESPACE +".jqPivot" , {
        
        //Options to be used as defaults
        options: {
            data : null,
            columnHeaders :null,
            viewport : null,
            columnMinWidth : 15, 			//minimum width value in pixels allowed for a column
            tableWidth :"100%",
            gripInnerHtml : '',				//if it is required to use a custom grip it can be done using some custom HTML
            hoverCursor : "e-resize",  		//cursor to be used on grip hover
			dragCursor : "e-resize",  		//cursor to be used while dragging
            liveDrag: false,				//enables table-layout updaing while dragging
            mainGridClassName :"jqPivotTable",
            gridRowClassName : "jqPivotGridRow",
            gridHeaderClassName : "jqPivotGridHeader",
            leftCellClassName : "leftCell",
            rightCellClassName : "rightCell",
            totalPagesNumber : 1,
            gridRows: -1,
            maxRowsNumber : 0,
            tooltipOptions :{
                topOffset : 3,
                leftOffset : 3,
                maxWidth : 300,
                fadingSpeed : 10,
                defaultHtmlContent: null
            }
        },

        // Respond to any changes the user makes to the
        // option method
        _setOption: function ( key, value ) {
            switch (key) {
            case "data":
                //this.options.someValue = doSomethingWith( value );
                break;
            case "viewport":
                this.viewport(value);
            break;
            case "maxRowsNumber":
                this.maxRowsNumber(value);
            break;
            default:
                //this.options[ key ] = value;
                break;
            }

            // For UI 1.8, _setOption must be manually invoked
            // from the base widget
            $.Widget.prototype._setOption.apply( this, arguments );
            // For UI 1.9 the _super method can be used instead
            // this._super( "_setOption", key, value );
        },

        _create: function () {
            // _create will automatically run the first time
            // this widget is called. Put the initial widget
            // setup code here, then you can access the element
            // on which the widget was called via this.element.
            // The options defined above can be accessed
            // via this.options this.element.addStuff();
            
            var options = this.options,
                viewport = options.viewport,
                mainGridName = options.mainGridClassName,
                htmlData = "<table class=\""+mainGridName+"\" cellpadding=\"0\" cellspacing=\"0\"><TBody></TBody></table>",// ToDo: remove attributes: cellpadding & cellspacing
                $table =  $($(this.element[0]).html(htmlData).find('.'+mainGridName)[0]);
            
            $table.data(PIVOT_NAMESPACE,{options:options});

            // transfer the plugin's options to the viewport
            if (viewport != null){
                viewport.initialize(options);// Initialize the viewport
                viewport.requestDataCallback = bind(this, this._viewportDataRequestCallback);// Attach to the viewport data request callback
            }

            this._generateGridHeaders($table);
            this._generateGridRows($table);

            var tooltip = this._createToolTip();
            // Attach the tooltip on the grid's cells
            $table.find('.'+options.gridRowClassName)
                  .on("mouseenter",bind(this,function mouseEnter(e){
                        var htmlContent = this._parseTooltipTagsInText(e.target, options.tooltipOptions.defaultHtmlContent);
			            var xCoordinate = e.clientX + document.documentElement.scrollLeft;
                        var yCoordinate = e.clientY + document.documentElement.scrollTop;
                        tooltip.show({
                            tooltipHtmlContent: htmlContent,
                            currentX: xCoordinate,
                            currentY: yCoordinate
                        });
                    })
                  )
                  .on("mouseout", bind(this, function mouseOut(e){
                        tooltip.hide();
                    })
                  );

            // Create the resizing column grips
            this._createGripsInGrid($table);
//            $table.colResizable({
//			liveDrag:true, 
//			gripInnerHtml:"<div class='grip'></div>", 
//			draggingClass:"dragging"})
        },

        // Destroy an instantiated plugin and clean up
        // modifications the widget has made to the DOM
        _destroy: function () {

            // this.element.removeStuff();
            // For UI 1.8, destroy must be invoked from the
            // base widget
            $.Widget.prototype.destroy.call(this);
            // For UI 1.9, define _destroy instead and don't
            // worry about
            // calling the base widget
        },
        _viewportDataRequestCallback: function(dataObject){
            this._trigger( "requestdata", null, dataObject );
        },
        _parseTooltipTagsInText: function(cell, text){
            if ( text == null || text.length < 1 ||
                 cell == null || cell.id == null )
                return "";
                
            var pieces, subpieces, tag, len, cellColumn, cellRow, parsedText,cellIDPieces;

            pieces = text.split("{{");
            len = pieces.length;
            if (len < 2)
                return text;
                
            for (var a = 0; a < len; a++){
                if (pieces[a].indexOf("}}") < 0) {
                    continue;
                }
                subpieces = pieces[a].split("}}");
                if (subpieces.length < 1) {
                    continue;
                }

                tag = subpieces[0];
                cellIDPieces = cell.id.split("_");
                if (cellIDPieces == null || cellIDPieces.length < 2) {
                    continue;
                }

                cellRow = parseInt(cellIDPieces[0])-1;
                cellColumn = parseInt(cellIDPieces[1])-1;
                
                switch(tag){
                    case "_name":
                    parsedText = this._getColumnHeaderFromIndex(cellColumn);
                    break;
                    case "value":
                    parsedText = this.options.data[cellRow][cellColumn];
                    break;
                }

                subpieces[0] = parsedText;
                pieces[a] = subpieces.join('');
            }

            return pieces.join('');
        },
        _getColumnHeaderFromIndex: function (columnIndex){
            /**
            * Get the column header description for the column with the passed index
            * 
            * @private
            * @param {number} columnIndex	The index of the column.
            * @return {number}              Return the column header text if the index for the passed column is specified otherwise it return an HTML blank space.
            */
            var retVal,
                colCnt = 0;
            var options = this.options;
            if (options != null && options.columnHeaders != null){
                colCnt = options.columnHeaders.length;
            }
            if (colCnt < 1 || columnIndex >= colCnt){
                retVal = "&nbsp;";
            }
            else{
                retVal = options.columnHeaders[columnIndex];
            }

            return retVal;
        },

        /**
        * Generates the HTML for the Grid Headers
        * 
        * @private
        * @param {object} data	Grid's Data
        * @return {string}		The HTML for the Grid's rows
        */
        _generateGridHeaders: function (table){

            var options = this.options;
            if (options == null){
                return;
            }

            var headersData = options.data;
            var $table = $(table);

            if (headersData == null || $table == null){
                return;
            }
            
            var dataLength = headersData.length;
            if (dataLength < 1) {
                return;
            }

            // Find the maximum number of elements between all the arrays
            var max = 0,
                arrLen = headersData.length,
                cnt;
            for (cnt = 0; cnt< arrLen; cnt++){
                max = Math.max(max, headersData[cnt].length);
            }

            // Save the number of columns in the data object
            $table.data(DATA_CURRENT_COLUMN_NUMBER, max);

            var gridHeaderClassName = options.gridHeaderClassName,
                colgroupHTML = "<colgroup>",
                theadHTML = "<thead><tr>",
                cellClasses = gridHeaderClassName+" "+options.leftCellClassName;

            for (cnt = 0; cnt < max; cnt++) {
                if (cnt == max-1){
                    cellClasses = gridHeaderClassName+" "+options.rightCellClassName;
                }

                colgroupHTML += "<col class=\""+cellClasses+"\"/>";
                
                theadHTML += "<th>"+this._getColumnHeaderFromIndex(cnt)+"</th>";
            }

            colgroupHTML += "</colgroup>",
            theadHTML += "</tr></thead>";
            $(colgroupHTML+theadHTML).prependTo($table);
        },

        _generateGridRows: function (table){
            var options = this.options;
            if (options == null){
                return;
            }

            var data = options.data,
                viewport = options.viewport,
                $table = $(table);

            if (data == null || $table == null || viewport == null || !(viewport instanceof JqPivotBaseViewport)){
                return;
            }

            if (data.length < 1){
                return "";
            }

            var leftCellClassName = options.leftCellClassName,
                rightCellClassName = options.rightCellClassName,
                currentColNumber = $table.data(DATA_CURRENT_COLUMN_NUMBER),
                mainGridName = options.mainGridClassName,
                $currentRow,
                currentCellName,
                columnCount,
                cellClasses;

            // Grab the body from the main table and append a row that spans across all the columns
            var $tbody = $table.find("tbody:last"),
                $row = $("<tr />").css("border","0px"),
                $mainColumn = $("<td />")
                                .addClass("jqPivotInnerCell")
                                .attr("colspan",currentColNumber)
                                .css("position","relative");

            $row.append($mainColumn);
            $tbody.append($row);
            
            // Invoke the inner table creation on the plugin
            viewport.createInnerTable($mainColumn);
            
            viewport._populateGridwithData(options.data);
        },
        /**
        * Attach the grips for column resizing to the passed grid.
        * 
        * @private
        * @param {object} grid	The grid which we want to attach the grips
        * @return {undefined}
        */
        _createGripsInGrid: function (table){

            // Attach the styles
            $("head").append("<style type='text/css'>."+PIVOT_NAMESPACE+"Grips{ height:0px; position:relative;} ."+PIVOT_NAMESPACE+"Grip{margin-left:-2px; position:absolute; z-index:5; } ."+PIVOT_NAMESPACE+"Grip ."+PIVOT_NAMESPACE+"ColResizer{position:absolute;background-color:red;opacity:0;width:10px;height:100%;top:0px} ."+PIVOT_NAMESPACE+"Table, ."+PIVOT_NAMESPACE+"InnerTable {table-layout:fixed;} ."+PIVOT_NAMESPACE+"Table td, ."+PIVOT_NAMESPACE+"Table th{overflow:hidden;padding-left:0!important; padding-right:0!important;} ."+PIVOT_NAMESPACE+"LastGrip{position:absolute; width:1px;} ."+PIVOT_NAMESPACE+"GripDrag{ margin-left:2px; border-left:1px dotted black;}</style>");

            var $table = $(table);
            
            $table.before('<div class="'+PIVOT_NAMESPACE+'Grips"/>');	//the grips container object is added. Signature class forces table rendering in fixed-layout mode to prevent column's min-width

            var drag;//ToDo: Move to plugin data obj
            $table.options = this.options;
            $table.grips = [];   // array of grips
            $table.columns = []; // array of columns
            $table.gripsContainer = $table.prev();		
            
            $table.cellSpacing = parseInt($table.css('border-spacing')) || 2;
            $table.border = parseInt($table.css('border-left-width')) || 1;
     
            //ToDo: Move all the variables like grips, columns, etc. into table data
            //$table.data("grips",tableData);

            var th = $table.find(">thead>tr>th,>thead>tr>td");	//if table headers are specified in its semantically correct tag, are obtained
		    if(th.length == undefined) th = $table.find(">tbody>tr:first>th,>tr:first>th,>tbody>tr:first>td, >tr:first>td");	 //but headers can also be included in different ways
		    $table.colGroup = $table.find("col"); 			    //a table can also contain a colgroup with col elements		
		    $table.currentLength = th.length;				    //table length is stored	
		    //if($table.p && S && S[$table.id])memento($table,th);		//if 'postbackSafe' is enabled and there is data for the current table, its coloumn layout is restored

            /**
	         * Function that places each grip in the correct position according to the current table layout	 * 
	         * @param {jQuery ref} t - table object
	         */
	        var syncGrips = function _syncGrips(table){
		        table.gripsContainer.width(table.width());		//the grip's container width is updated	
                
                var currentColumn;
                		
		        for(var i = 0; i < table.currentLength; i++){	//for each column
			        currentColumn = table.columns[i]; 			
			        table.grips[i].css({			//height and position of the grip is updated according to the table layout
				        left: currentColumn.offset().left - table.offset().left + currentColumn.outerWidth() + Math.floor(table.cellSpacing / 2) + "px",
				        height: table.outerHeight()				
			        });			
		        } 	
	        };
            
            /**
	         * Event handler fired when the browser is resized. The main purpose of this function is to update
	         * table layout according to the browser's size synchronizing related grips 
	         */
	        var onResize = function _OnResize(){

                    var mainGridName = $table.options.mainGridClassName;		
                    $table.removeClass(mainGridName);						//firefox doesnt like layout-fixed in some cases

                    var tableLength = $table.currentLength,
                        tableWidth = $table.width(),
                        perc, i;

				    for(i=0; i < tableLength; i++) {
                        perc = Math.round(($table.columns[i].width() * 100) / tableWidth) + "%";
                        $table.columns[i].css("width", perc);
                    }
							
                    $table.addClass(mainGridName);

			        syncGrips($table);
	        };

            //bind resize event, to update grips position 
	        $(window).on('resize.'+PIVOT_NAMESPACE, onResize); //ToDo: change it to 'on' method

            /**
	        * This function updates column's width according to the horizontal position increment of the grip being
	        * dragged. The function can be called while dragging if liveDragging is enabled and also from the onGripDragOver
	        * event handler to synchronize grip's position with their related columns.
	        * @param {jQuery ref} table - table object.
	        * @param {nunmber} index - index of the grip being dragged.
	        * @param {bool} isOver - to identify when the function is being called from the onGripDragOver event.
	        */
	        var syncCols = function _SyncCols(table, index){
		        var currentColumn = table.columns[index],
                    nextColumn = table.columns[index+1], 			
		            currentColumnWidth = drag.position().left, // their new width is obtained
                    inc, nextColumnWidth;		

                inc = nextColumn.width() - (currentColumnWidth - currentColumn.width());
                nextColumnWidth= inc;

                //and set
		        currentColumn.width( currentColumnWidth + "px");
                nextColumn.width(nextColumnWidth + "px");                
	        };
 		    
            /**
	         * Event handler used while dragging a grip. It checks if the next grip's position is valid and updates it. 
	         * @param {event} e - mousemove event binded to the window object
	         */
	        var onGripDrag = function _OnGripDrag (e){	
		        if(drag == undefined) {
                    return;
                }

		        var minWidth = $table.options.columnMinWidth, //cell's min width
                    columnIndex = drag.columnIndex,
                    $currentGrip = $($table.grips[columnIndex].find("."+PIVOT_NAMESPACE+"ColResizer")[0]),
                    x = e.pageX - $table.position().left - Math.floor(($currentGrip.width()/2)),	 //next position according to horizontal mouse position increment
		            min = $table.cellSpacing*1.5 + minWidth + $table.border,
                    max, rightColumnBorderCoord;

		        if (columnIndex > 0)
                    x -= $table.grips[columnIndex-1].position().left;

                //max position according to the contiguous cells
                if (columnIndex == 0){
                    rightColumnBorderCoord = 0
                } else {
                    rightColumnBorderCoord = $table.grips[columnIndex-1].position().left;
                }

                max =  $table.grips[columnIndex+1].position().left - rightColumnBorderCoord - minWidth;
		        x = Math.max(min, Math.min(max, x)); //apply boundings

		        //apply position increment
                drag.x = x;
                drag.css("left",  x + "px");		
			
                //if liveDrag is enabled
		        if($table.options.liveDrag){
                    //columns and grips are synchronized
			        syncCols($table, columnIndex);
                    syncGrips($table);
		        }
		
		        return false; 	//prevent text selection				
	        };
	
	        /**
	         * Event handler fired when the dragging is over, updating table layout.
             * @param {event} e - mousemove event binded to the window object
	         */
	        var onGripDragOver = function _OnGripDragOver (e){	
		        $document.off('mousemove.'+PIVOT_NAMESPACE)
                         .off('mouseup.'+PIVOT_NAMESPACE);
		        $("head :last-child").remove(); 				//remove the dragging cursor style	
		        if(drag == undefined){
                    return;	
                }
                
                drag.removeClass(PIVOT_NAMESPACE+"GripDrag");

		        //if($table.p && S) memento(t); 						//if postbackSafe is enabled and there is sessionStorage support, the new layout is serialized and stored
		        drag = null;									//since the grip's dragging is over									
	        };

	        /**
	         * Event handler fired when the grip clicked.
             * @param {event} e - mousemove event binded to the window object
	         */
            var onGripMouseDown = function _OnGripMouseDown(e){
		        var gripData = $(this).data(PIVOT_NAMESPACE);	    //retrieve grip's data
		        var grip = $table.grips[gripData.columnIndex];		//shortcuts for the table and grip objects
		        grip.originalX = e.pageX;
                grip.left = grip.position().left;	//the initial position is kept
                			
		        $(document).on('mousemove.'+PIVOT_NAMESPACE, onGripDrag)
                           .on('mouseup.'+PIVOT_NAMESPACE,onGripDragOver);	//mousemove and mouseup events are bound
		        $("head").append("<style type='text/css'>*{cursor:"+ $table.options.dragCursor +"!important}</style>"); 	//change the mouse cursor		
		        grip.addClass(PIVOT_NAMESPACE+"GripDrag"); 	//add the dragging class (to allow some visual feedback)	
                drag = grip;							//the current grip is stored as the current dragging object
		        
		        return false; 	//prevent text selection
	        };

		    th.each(function(index){					//iterate through the table column headers			
			    var $currentColumn = $(this); 			//jquery wrap for the current column		
			    var $grip = $($table.gripsContainer.append('<div class="'+PIVOT_NAMESPACE+'Grip"></div>')[0].lastChild); //add the visual node to be used as grip

                //the width of the column is converted into percentage-based measurements
                var perc = Math.round(($currentColumn.width() * 100) / $table.width()) + "%";
                $currentColumn.css("width", perc);
                //the width of the column is converted into pixel-based measurements
//              $currentColumn.width($currentColumn.width()).removeAttr("width");
                
                //some values are stored in the grip's node data
                $grip.columnIndex = index;
                $grip.columns = $currentColumn;
                
                //the current grip and column are added to its table object
			    $table.grips.push($grip);
                $table.columns.push($currentColumn);
                
                var $gripHtml = $table.options.gripInnerHtml;
                if ($gripHtml == null || $gripHtml.length < 6) // the minimum size for the html is 6 because at least the user has to use "<div/>" as html for the grip.
                    $gripHtml = "<div class='grip'></div>";
                var hoverCursor = $table.options.hoverCursor;
                if (hoverCursor == null)
                    hoverCursor = '';
			    if (index < $table.currentLength-1) { //bind the mousedown event to start dragging 
                	$grip.mousedown(onGripMouseDown)
                        .append($gripHtml)
                        .append('<div class="'+PIVOT_NAMESPACE+'ColResizer" style="cursor:'+hoverCursor+'"></div>');
                }
			    else {//the last grip is used only to store data
                    $grip.addClass(PIVOT_NAMESPACE+"LastGrip")
                        .removeClass(PIVOT_NAMESPACE+"Grip");	
                }	
			    $grip.data(PIVOT_NAMESPACE, {columnIndex:index, table:$table.attr('class')}); //grip index and its table name are stored in the HTML 												
		    }); 	
		    $table.colGroup.removeAttr("width");	//remove the width attribute from elements in the colgroup (in any)
		    syncGrips($table); 				//the grips are positioned according to the current table layout			
		    //there is a small problem, some cells in the table could contain dimension values interfering with the 
		    //width value set by this plugin. Those values are removed
		    $table.find('td, th').not(th).not('table th, table td').each(function(){  
			    $currentColumn.removeAttr('width');	//the width attribute is removed from all table cells which are not nested in other tables and dont belong to the header
            });
        },
        _createToolTip: function (){
            /**
            * Create the ToolTip object
            * 
            * @private
            * @return {object} ToolTip Object
            */
            var id = PIVOT_NAMESPACE+'Tooltip';
	        var endAlpha = 95;
	        var timerID = 20;
	        var alpha = 0;
            var browser = $.browser;
            var ie = browser.msie;
	        var safari = browser.safari;
            var options = this.options;

            var topOffset = options.tooltipOptions.topOffset;
	        var leftOffset = options.tooltipOptions.leftOffset;
	        var maxWidth = options.tooltipOptions.maxWidth;
	        var fadingSpeed = options.tooltipOptions.fadingSpeed;

            var mainDiv,topDiv,contentDiv,bottomDiv,tooltipHeight;
            
            var tooltipInstance = {
		        show: function show(params){
                    var tooltipHtmlContent = params.tooltipHtmlContent | "",
                        tooltipWidth = params.tooltipWidth,
                        currentX = parseInt(params.currentX),
                        currentY = parseInt(params.currentY);

                    if (isNaN(currentX) || isNaN(currentY)){
                        throw "Undefined coordinates.";
                    }

			        if(mainDiv == null){
				        mainDiv = document.createElement('div');
				        mainDiv.setAttribute('id',id);
				        topDiv = document.createElement('div');
				        topDiv.setAttribute('id',id + 'top');
				        contentDiv = document.createElement('div');
				        contentDiv.setAttribute('id',id + 'cont');
				        bottomDiv = document.createElement('div');
				        bottomDiv.setAttribute('id',id + 'bot');
				        mainDiv.appendChild(topDiv);
				        mainDiv.appendChild(contentDiv);
				        mainDiv.appendChild(bottomDiv);
				        document.body.appendChild(mainDiv);
				        mainDiv.style.opacity = 0;
				        mainDiv.style.filter = 'alpha(opacity=0)';
                        mainDiv.style.position = 'absolute';
			        }
			        mainDiv.style.display = 'block';

			        contentDiv.innerHTML = tooltipHtmlContent;
			        
                    mainDiv.style.width = tooltipWidth ? tooltipWidth + 'px' : 'auto';
			        
                    if (tooltipWidth == undefined){
				        topDiv.style.display = 'none';
				        bottomDiv.style.display = 'none';
				        mainDiv.style.width = mainDiv.offsetWidth;
				        topDiv.style.display = 'block';
				        bottomDiv.style.display = 'block';
			        }

			        if(mainDiv.offsetWidth > maxWidth) {
                        mainDiv.style.width = maxWidth + 'px'
                    }

			        tooltipHeight = parseInt(mainDiv.offsetHeight) + topOffset;

			        clearInterval(mainDiv.timer);

                    if (tooltipHtmlContent) {
                        // Calculate the current tooltip position
                        tooltipInstance.calculatePosition(currentX, currentY);
                                                          
                        // set the fade in timer
			            mainDiv.timer = setInterval(bind(tooltipInstance, function(){this.fade(true);}),timerID);
                    } else {
                        mainDiv.timer = null;
                        }

		        },
		        calculatePosition: function calculatePosition(){
			        var currentTop = event.clientY + document.documentElement.scrollTop;
			        var currentLeft = event.clientX + document.documentElement.scrollLeft;
			        mainDiv.style.top = (currentTop - tooltipHeight) + 'px';
			        mainDiv.style.left = (currentLeft + leftOffset) + 'px';
		        },
		        fade: function fade(isFadeIn){
			        if((alpha != endAlpha && isFadeIn === true) || (alpha != 0 && isFadeIn !== true)){
				        var i = fadingSpeed;
				        if(endAlpha - alpha < fadingSpeed && isFadeIn === true){
					        i = endAlpha - alpha;
				        }else if(alpha < fadingSpeed && isFadeIn !== true){
					        i = alpha;
				        }

                        i *= isFadeIn ? 1 : -1;
				        alpha += i;
				        mainDiv.style.opacity = alpha * .01;
				        mainDiv.style.filter = 'alpha(opacity=' + alpha + ')';
			        }else{
				        clearInterval(mainDiv.timer);
				        if(isFadeIn !== true){
                            mainDiv.style.display = 'none'
                        }
			        }
		        },
		        hide: function hide(){
			        clearInterval(mainDiv.timer);
			        mainDiv.timer = setInterval(bind(tooltipInstance,function(){this.fade();}),timerID);
		        } 
            };

            return tooltipInstance;
        },

        viewport: function (value){
            // no value passed, act as a getter
		    if ( value === undefined ) {
			    return this.options.viewport;
		    // value passed, act as a setter
		    } else {
			    this.options.viewport = value;
		    }
        },
        maxRowsNumber: function (value) {
            // no value passed, act as a getter
		    if ( value === undefined ) {
			    return this.options.maxRowNumber;
		    // value passed, act as a setter
		    } else {
			    this.options.maxRowsNumber = value;
                this.options.viewport.maxRowsNumber(value);
		    }
       },
        populateData: function (data) {
            this.options.viewport.setDataFromRequest(data);
        }
   });

    // Attach the Viewport classes to jqPivot namespace
    $.extend($.jqPivot, { "JqPivotBaseViewport": JqPivotBaseViewport});
    $.extend($.jqPivot, { "jqPivotPagingViewport": jqPivotPagingViewport});
    $.extend($.jqPivot, { "jqPivotScrollingViewport": jqPivotScrollingViewport});

})( jQuery, window, document );