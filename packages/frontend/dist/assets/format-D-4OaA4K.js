const n=e=>{const r=new Date(e),t=new Date().getTime()-r.getTime();return t<6e4?"刚刚":t<36e5?`${Math.floor(t/6e4)}分钟前`:t<864e5?`${Math.floor(t/36e5)}小时前`:r.toLocaleDateString("zh-CN")},a=e=>e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}K`:e.toString(),i=e=>`$${e.toFixed(2)}`;export{a,n as b,i as f};
//# sourceMappingURL=format-D-4OaA4K.js.map
