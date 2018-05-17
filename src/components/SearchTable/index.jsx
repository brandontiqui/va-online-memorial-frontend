import React, { Component } from 'react';
import { NavLink } from 'react-router-dom';
import Pagination from "react-js-pagination";

import './styles.scss';

class SearchTable extends Component {
  constructor(props) {
    super(props);

    this.toggle = this.toggle.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    this.state = {
      toggleState: '',
      activePage: 1,
      itemsPerPage: 10
    };
  }

  toggle(){
    this.setState({
      'toggleState': this.state.toggleState === 'open' ? '' : 'open'
    })
  }

  handlePageChange(pageNumber) {
    console.log(`active page is ${pageNumber}`);
    this.setState({activePage: pageNumber});
  }

  highlightText(keyword, text){
    if(!!keyword){
      let newText = text;
      let re = new RegExp(keyword, "g");
      newText = newText.replace(re, '<strong>'+keyword+'</strong>');
      return newText;
    }else{
      return text;
    }
  }

  render () {
    let {keyword, searchedResults, addClass} = {...this.props.attr}

    return(
      <div className={"searchtable-wrap " + addClass}>
       <div className="datatable">
        <table>
        <tbody>
          <tr className="hide-md">
            <th>Name</th>
            <th>Life</th>
            <th className="hide-md">Buried at</th>
            <th className="hide-md">Branch</th>
            <th className="hide-md">Rank</th>
          </tr>
          {
            !!searchedResults && searchedResults.map((item, i)=> {
              let startIndex = (this.state.activePage - 1) * this.state.itemsPerPage;
              let endIndex = startIndex + this.state.itemsPerPage;

                return (
                  !!(i >= startIndex && i < endIndex )
                  ?
                     (
                      <tr key={i}>
                        <td>
                          <div className="td-user">
                            <NavLink to="/dashboard" className="user"><img src={item.profileImgSrc} alt="" /> 
                            <span dangerouslySetInnerHTML={{ __html: this.highlightText(keyword, item.name) }}></span> </NavLink>
                            <div className="txt view-md">{item.burriedAt}</div>
                          </div>
                        </td>
                        <td>{item.life}</td>
                        <td className="hide-md">{item.burriedAt} </td>
                        <td className="hide-md">{item.branch}</td>
                        <td className="hide-md">{item.rank}</td>
                      </tr>
                    )
                  : null
                )
            
            })
          }
          </tbody>
        </table>
       </div>
       
       <div className="action">
          <NavLink to="/search" className="btn">View All</NavLink>
       </div>

       <div className="pagination-wrap">
       {!!searchedResults 
        ? (<Pagination
           hideDisabled
           activePage={this.state.activePage}
           itemsCountPerPage={this.state.itemsPerPage}
           totalItemsCount={searchedResults.length}
           pageRangeDisplayed={5}
           onChange={this.handlePageChange}
           linkClassFirst = {'hide'}
           linkClassLast = {'hide'}
           nextPageText ={ "Next"}
           prevPageText = {"Prev"}
           linkClassNext = {"next"}
           linkClassPrev = {"prev"}
         />)
        : ''
      }
       </div>
      </div>
    );
  }
}

export default SearchTable;
