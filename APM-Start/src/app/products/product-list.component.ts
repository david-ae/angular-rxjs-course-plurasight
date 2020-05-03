import { Component, ChangeDetectionStrategy} from '@angular/core';

import { ProductService } from './product.service';
import { EMPTY, throwError, Subject, combineLatest } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';
import { ProductCategoryService } from '../product-categories/product-category.service';

@Component({
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']//,
  //changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductListComponent {
  pageTitle = 'Product List';
  errorMessage = '';
  categories;

  private categorySelectedSubject = new Subject<number>();
  categorySelectedAction$ = this.categorySelectedSubject.asObservable();

  products$ = combineLatest([
    this.productService.productsWithCategory$,
    this.categorySelectedAction$
    .pipe(startWith(0))
  ])
  .pipe(
    map(([products, selectedCategoryId]) => 
      products.filter(product => 
        selectedCategoryId ? product.categoryId === selectedCategoryId : true
        )),
    catchError(err => {
      this.errorMessage = err;
      //return EMPTY
      return throwError(err);
    })
  );;

  constructor(private productService: ProductService, private categoryService: ProductCategoryService) { }

  categories$ = this.categoryService.productCategories$
  .pipe(
    catchError(err => {
      this.errorMessage = err;
      return EMPTY;
    })
  );

  onAdd(): void {
    this.productService.addProduct();
  }

  onSelected(categoryId: string): void {
    this.categorySelectedSubject.next(+categoryId);    
  }
}
