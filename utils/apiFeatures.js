class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // BUILD QUERY
    // 1A. Filtering
    // eslint-disable-next-line node/no-unsupported-features/es-syntax
    const queryObj = { ...this.queryString };
    // if we were just to dod queryObj = req.query, then we will not have a hard object. To get a hard object, we will have to do what we did above. Now, if we change something in queryObj, that change won't be reflected in request.query.
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => {
      delete queryObj[el];
    });
    // 1B. ADVANCED FILTERING
    // If we want to include relational operators in our query too, then they would look something like this in MongoDB:
    /*
      {
        difficulty: 'easy',
        duration: {$gte: 5}
      }
      However, in request.query, it would look something like:
      {
        difficulty: 'easy',
        duration: {gte: 5}
      }
      So the only difference is that of the $ symbol. 
      Specifying the relational operators in the URL look something like:
      /tours?difficulty=easy&duration[gte]=5
      */
    // console.log(request.query, queryObj);
    // stores the query in the URL as an object.
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(
      /\b(gte|gt|lte|lt)\b/g,
      (matchedWord) => `$${matchedWord}`
    );
    this.query = this.query.find(JSON.parse(queryStr));
    // let query = Tour.find(JSON.parse(queryString));
    return this; // return the object so that we can implement chaining.
  }

  sort() {
    // 2. SORTING
    if (this.queryString.sort) {
      //const sortBy = request.query.sort.split(',').join(' ');
      // split the sort property by comma, then join the words  by a comma.
      const sortBy = this.queryString.sort.replace(/,/g, ' ');
      // Normally replace() only replaces the first instance. To replace all instances, we need to pass in the global modifier along with a regex.
      // in the URL, the sorting properties are delimited by a comma, but the sort() requires them to be delimited by spaces. So we have implemented that here.
      this.query = this.query.sort(sortBy);
      // if there is a tie, then we can break the tie by specifying a second property with which to sort. This is done by passing a string to the sort() which is of the format:
      // 'propertyOne propertyTwo ... propertyN '
      // sort by value of the property 'sort' in the object request.query
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    // 3. FIELD LIMITING
    /*
        This feature allows us to basically allow the client to choose which specific fields he wants to receive. By limiting other fields, he/she can save on bandwith on each request.
        In the URL, the fields that a client wants are specified by:
        /?fields=fieldOne,fieldTwo,...,fieldN
      */
    if (this.queryString.fields) {
      const fields = this.queryString.fields.replace(/,/g, ' ');
      this.query = this.query.select(fields);
      // query.select() allows us to select only the fields that are in fields. So, basically, as an argument, it accepts the name of fields that a client wants separated by ' '.
      // This operation of selecting certain field names is called projecting.
    } else {
      this.query = this.query.select('-__v');
      // __v field is used internally by Mongoose, but the client doesn't really need it. So in the event that no projection is done, we want to show all the data except __v. To exclude a field, we pass in the following string:
      // -fieldOne, -fieldTwo,..., fieldN
    }
    return this;
  }

  paginate() {
    //4. PAGINATION
    /*
      Suppose that we have 1000 documents in our collection. It is quite cumbersome to display all that data in a single page. To divide these documments, we implement pagination so we can separate them into different pages. This is done in the URL using:
      /page=a&limit=b
      where a,b E Z+
      value of page defines the page number that we are at, and the value of limit defines the number of documents to be displayed at each page.
      */
    const page = this.queryString.page * 1 || 1;
    // || defautValue, if this.queryString.page is falsy
    const limitValue = this.queryString.limit * 1 || 100;
    const skipValue = limitValue * (page - 1);
    this.query = this.query.skip(skipValue).limit(limitValue);
    // skip() is the amount of results that should be skipped before actually querying the data.
    // skip(limit * (page - 1))
    // We are not using skip values, but instead page value, because its much easier for the user to deal with pages.
    return this;
  }
}

module.exports = APIFeatures;
