import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError, combineLatest, BehaviorSubject, Subject, from } from 'rxjs';
import { catchError, tap, map, scan, shareReplay, mergeMap, toArray, filter, switchMap } from 'rxjs/operators';
import { merge } from 'rxjs';

import { Product } from './product';
import { Supplier } from '../suppliers/supplier';
import { SupplierService } from '../suppliers/supplier.service';
import { ProductCategoryService } from '../product-categories/product-category.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private productsUrl = 'api/products';
  private suppliersUrl = this.supplierService.suppliersUrl;

  private productSelectedSubject = new BehaviorSubject<number>(0);
  productSelectedAction$ = this.productSelectedSubject.asObservable();

  products$ = this.http.get<Product[]>(this.productsUrl)
          .pipe(
            map(products => 
              products.map(product => ({
                ...product,
                price: product.price * 1.5,
                searchKey: [product.productName]
              }) as Product)
            ),
            //tap(data => console.log('Products: ', JSON.stringify(data))),
            catchError(this.handleError)
          );

 productsWithCategory$ = combineLatest([
   this.products$,
   this.productCategory.productCategories$
  ]).pipe(
        map(([products, categories]) => 
          products.map(product => ({
              ...product,
              price: product.price * 1.5,
              category: categories.find(c => product.categoryId == c.id).name,
              searchKey: [product.productName]
          })as Product)
        ),
        shareReplay(1)
    );    
    
selectedProduct$ = combineLatest([
   this.productsWithCategory$,
   this.productSelectedAction$
])
.pipe(
  map(([products, selectedProductId]) => 
    products.find(product => product.id === selectedProductId)
    ),
    tap(product => console.log("selectedProduct", product)),
    shareReplay(1)
);

// selectedProductSuppliers$ = combineLatest([
//   this.selectedProduct$,
//   this.supplierService.suppliers$
// ]).pipe(
//   map(([selectProduct, suppliers]) => 
//     suppliers.filter(supplier => selectProduct.supplierIds.includes(supplier.id)))
// )

selectedProductSuppliers$ = this.selectedProduct$
.pipe(
  filter(selectedProduct => Boolean(selectedProduct)),
  switchMap(selectedProduct => 
    from(selectedProduct.supplierIds)
      .pipe(
        mergeMap(supplierId => this.http.get<Supplier>(`${this.suppliersUrl}/${supplierId}`)),
        toArray()
      ))
) 

private productInsertSubject = new Subject<Product>();
productInsertAction$ = this.productInsertSubject.asObservable();

productsWithAdd$ = merge(
  this.productsWithCategory$,
  this.productInsertAction$
)
.pipe(
  scan((acc: Product[], value: Product) => [...acc, value])
);

selectedProductChanged(selectedProductId: number): void{
  this.productSelectedSubject.next(selectedProductId);
}

addProduct(newProduct?: Product){
  newProduct = newProduct || this.fakeProduct();
  this.productInsertSubject.next(newProduct);
}

  constructor(private http: HttpClient, private productCategory: ProductCategoryService,
              private supplierService: SupplierService) { }

  // getProducts(): Observable<Product[]> {
  //   return 
  // }

  private fakeProduct() {
    return {
      id: 42,
      productName: 'Another One',
      productCode: 'TBX-0042',
      description: 'Our new product',
      price: 8.9,
      categoryId: 3,
      category: 'Toolbox',
      quantityInStock: 30
    };
  }

  private handleError(err: any) {
    // in a real world app, we may send the server to some remote logging infrastructure
    // instead of just logging it to the console
    let errorMessage: string;
    if (err.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      errorMessage = `An error occurred: ${err.error.message}`;
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      errorMessage = `Backend returned code ${err.status}: ${err.body.error}`;
    }
    console.error(err);
    return throwError(errorMessage);
  }

}
