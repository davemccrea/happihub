const ClearFlash = {
  mounted() {
    setTimeout(() => {
      liveSocket.execJS(this.el, this.el.getAttribute("data-hide"));
      this.pushEvent("lv:clear-flash", { key: this.el.dataset.key });
    }, 5000);
  },
};

export default ClearFlash;
