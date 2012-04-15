/*
 * jqPivot, an advanced grid plugin for jQuery. 
 * (c) Rob Larsen, 2012
 * Stay tuned. 
 * Plugin boilerplate for now.
 */
;(function ( $, window, document, undefined ) {

    $.fn.jqPivot = function ( options ) {

        options = $.extend( {}, $.fn.jqPivot.options, options );

        return this.each(function () {

            var elem = $(this);

        });
    };


    $.fn.jqPivot.options = {

        key: "value",
        myMethod: function ( elem, param ) {

        }
    };

})( jQuery, window, document );