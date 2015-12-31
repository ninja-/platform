export default class WhitePage extends React.Component {
  constructor(props) {
    super(props);
    this.props = props;
  }
  render() {
    return (
      <div className="container-fluid white">
        <div className="inner__wrap">
          <div className="row content" id="reset">{this.props.children}</div>
        </div>
      </div>
    );
  }
}
