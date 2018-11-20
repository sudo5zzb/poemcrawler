class Poem{
	constructor(title,author,dynasty,content,fanyi,zhushi,jianshang,shangxi,background){
		this.title=title;
		this.author=author;
		this.dynasty=dynasty;
		this.content=content;
		this.fanyi=fanyi;
		this.zhushi=zhushi;
		this.jianshang=jianshang
		this.shangxi=shangxi;
		this.background=background;
	}

	isFanyiAndZhushi(title){
		if(!title){
			return false;
		}
	}
}