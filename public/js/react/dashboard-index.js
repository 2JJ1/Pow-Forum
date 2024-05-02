class ActivityCard extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            content: ""
        }
    }

    async componentDidMount(){
        let content = await HTMLToOembed(this.props.feed.content, { fileDomainWhitelist: true })
        this.setState({content})
    }

    render(){
        return (
            <div className="theme1 activitycard round border1 padding">
                { this.props.feed.isLowerRanked && <p className="delete" data-trid={this.props.feed._id}>x</p> }
                <p className="activityHeader">
                    <img className="pfp" src={this.props.feed.account.profilepicture}/>
                    <a href={`/profile?uid=${this.props.feed.account._id}`}>{this.props.feed.account.username} </a>
                    {this.props.feed.isOP ? "Created a new thread" :
                        <React.Fragment>
                        <a href={`/t/${this.props.feed.tid}?r=${this.props.feed._id}`}>
                            {"trid" in this.props.feed ? "Commented" : "Replied"}
                        </a> to thread 
                        </React.Fragment>
                    }
                    {":"} 
                    <a href={`/t/${this.props.feed.tid}`}> <span className="threadTitle">{this.props.feed.threadTitle}</span></a>
                </p>
                <div className="threadContent" dangerouslySetInnerHTML={{__html: this.state.content}}></div>
            </div>
        )
    }
}

class ActivityFeed extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            feed: [],
            moreFeedAvailable: false,
        }
    }

    loadActivityFeed() {
        let urlParams = new URLSearchParams(this.props.url.substring(this.props.url.indexOf("?")))
        if(this.state.feed.length > 0) urlParams.append("trid", this.state.feed[this.state.feed.length - 1]._id)

        fetch(`${this.props.url.substring(0,this.props.url.indexOf("?"))}?${urlParams}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        })
        .then(res => res.json())
        .then(res => {
            this.setState({
                //Feed appends
                feed: [...this.state.feed, ...res.feed],
                moreFeedAvailable: res.moreFeedAvailable
            })
        })
    }

    componentDidMount() {
        this.loadActivityFeed()
    }

    render() {
        return (
            <div className="gapchildren globalactivitycontainer">
                <h2>{this.props.title}</h2>
                {this.props.description && <p>{this.props.description}</p>}
                <div>
                    { 
                    this.state.feed.length <= 0 ? <p style={{textAlign: 'center'}}>This forum has no activity...</p> :
                    this.state.feed.map((feed) => <ActivityCard key={feed._id} feed={feed}/> )
                    }
                </div>
                {this.state.moreFeedAvailable && <button className="theme1 border1 button btnLoadMore" onClick={this.loadActivityFeed.bind(this)}>Load More</button>}
            </div>
        );
    }
}

// Render the React component inside the #root div
ReactDOM.render(
    <React.Fragment>
        <ActivityFeed 
        title="Unverified Activity Feed" 
        description="These posts may have been made by a bot and require verification before they're publicly displayed" 
        url='/api/account/activity?uid=0&unverified=true'/>
        <ActivityFeed 
        title="Global Activity Feed" 
        description="Unfiltered list of all created threads and replies on the forum"
        url='/api/account/activity?uid=0'/>
    </React.Fragment>,
    document.getElementById('root')
);