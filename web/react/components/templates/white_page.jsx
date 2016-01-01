export default class WhitePage extends React.Component {
  constructor(props) {
    super(props);
    this.props = props;
  }
  render() {
    return (
      <div className="container-fluid white">
        <div className="inner__wrap">
          <div className="row content" id="reset">
            <div className="col-sm-12">
    					<div className="signup-team__container">
    						<img className="signup-team-logo" src="/static/images/logo.png" />
                  {this.props.children}
	             </div>
              </div>
    				</div>
        </div>
      </div>
    );
  }
}
