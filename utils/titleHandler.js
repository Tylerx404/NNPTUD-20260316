module.exports = {
    ConvertTitleToSlug: function (title) {
        let result = title.toLowerCase();
        result = result.replaceAll(' ', '-');
        return title;
    }
}
